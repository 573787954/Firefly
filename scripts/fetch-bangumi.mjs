#!/usr/bin/env node
/**
 * 抓取 Bangumi 收藏数据，写入本地 JSON 文件
 *
 * 为什么需要它：
 *   本机网络对 Bangumi 系域名存在 SNI 阻断（api.bgm.tv / api.bangumi.pro / api.bangumi.one 全部无法访问），
 *   浏览器端 dynamic 模式因此必然拉取失败。改用 GitHub Actions 定时运行本脚本——
 *   抓到的数据提交进仓库，站点直接读本地 JSON。
 *
 * 用法：
 *   node scripts/fetch-bangumi.mjs
 *
 * 可用环境变量覆盖：
 *   BANGUMI_USER_ID   —— 用户 UID，默认 1288644
 *   BANGUMI_API_URL   —— 接口地址，默认 https://api.bgm.tv
 *   BANGUMI_OUT       —— 数据输出路径，默认 src/constants/bangumi-data.json
 *   BANGUMI_STATUS    —— 诊断输出路径，默认 src/constants/bangumi-sync-status.json
 *
 * 诊断文件会记录每次运行的结果（含 DNS 解析、HTTP 状态、错误原因），
 * 方便在无法查看 Actions 日志时（例如仓库是私有的或只读环境）排查问题。
 */

import dns from "node:dns/promises";
import fs from "node:fs";
import path from "node:path";

const USER_ID = process.env.BANGUMI_USER_ID || "1288644";
const API_URL = process.env.BANGUMI_API_URL || "https://api.bgm.tv";
const OUT_FILE = process.env.BANGUMI_OUT || "src/constants/bangumi-data.json";
const STATUS_FILE =
	process.env.BANGUMI_STATUS || "src/constants/bangumi-sync-status.json";

// Bangumi 官方要求带上可识别的 User-Agent
const USER_AGENT = "573787954-blog/1.0 (https://github.com/573787954/Firefly)";

// 分类 → Bangumi subject_type
const CATEGORIES = { book: 1, anime: 2, music: 3, game: 4 };

const PAGE_LIMIT = 50;
const MAX_TOTAL = 3000;
const RETRY = 3;
const PAGE_DELAY = 400;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function describeError(err) {
	const cause = err?.cause;
	return {
		message: err?.message ?? String(err),
		code: err?.code ?? cause?.code ?? null,
		cause: cause ? String(cause.message ?? cause) : null,
	};
}

function writeStatus(status) {
	fs.mkdirSync(path.dirname(STATUS_FILE), { recursive: true });
	fs.writeFileSync(STATUS_FILE, `${JSON.stringify(status, null, 2)}\n`, "utf8");
	console.log(`[bangumi] 已写入诊断文件 ${STATUS_FILE}`);
}

/** 网络环境探测：DNS 解析 + 一次原始请求，用于排查失败原因 */
async function probe() {
	const result = {
		host: new URL(API_URL).hostname,
		dns: null,
		httpStatus: null,
		bodyPreview: null,
		error: null,
	};

	try {
		result.dns = await dns.resolve4(result.host);
	} catch (err) {
		result.dns = `DNS 解析失败: ${describeError(err).code ?? err.message}`;
	}

	try {
		const res = await fetch(`${API_URL}/v0/subjects/8`, {
			headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
		});
		result.httpStatus = res.status;
		result.bodyPreview = (await res.text()).slice(0, 200);
	} catch (err) {
		Object.assign(result, { error: describeError(err) });
	}

	return result;
}

async function requestJson(url) {
	let lastErr;
	for (let attempt = 1; attempt <= RETRY; attempt++) {
		try {
			const res = await fetch(url, {
				headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
			});
			if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
			return await res.json();
		} catch (err) {
			lastErr = err;
			if (attempt < RETRY) {
				const wait = attempt * 1500;
				console.warn(
					`  ! 第 ${attempt} 次失败（${err.message}），${wait}ms 后重试…`,
				);
				await sleep(wait);
			}
		}
	}
	throw lastErr;
}

async function fetchCategory(label, subjectType) {
	const items = [];
	let offset = 0;

	while (true) {
		if (MAX_TOTAL > 0 && items.length >= MAX_TOTAL) break;
		const url = `${API_URL}/v0/users/${USER_ID}/collections?subject_type=${subjectType}&limit=${PAGE_LIMIT}&offset=${offset}`;
		const json = await requestJson(url);
		const batch = Array.isArray(json?.data) ? json.data : [];

		if (batch.length === 0) break;
		items.push(...batch);
		offset += PAGE_LIMIT;
		console.log(`  · ${label}: 已获取 ${items.length} 条`);
		if (batch.length < PAGE_LIMIT) break;
		await sleep(PAGE_DELAY);
	}
	return items;
}

async function main() {
	const startedAt = new Date().toISOString();
	console.log(`[bangumi] 抓取用户 ${USER_ID} 的收藏（接口 ${API_URL}）`);

	const networkProbe = await probe();
	console.log(`[bangumi] 网络探测: ${JSON.stringify(networkProbe)}`);

	const categories = {};
	const categoryErrors = {};

	for (const [key, subjectType] of Object.entries(CATEGORIES)) {
		try {
			categories[key] = await fetchCategory(key, subjectType);
		} catch (err) {
			console.error(`[bangumi] 分类 ${key} 抓取失败：${err.message}`);
			categories[key] = [];
			categoryErrors[key] = describeError(err);
		}
	}

	const counts = Object.fromEntries(
		Object.entries(categories).map(([k, v]) => [k, v.length]),
	);
	const total = Object.values(counts).reduce((n, v) => n + v, 0);
	const ok = total > 0;

	writeStatus({
		lastRunAt: startedAt,
		finishedAt: new Date().toISOString(),
		ok,
		userId: USER_ID,
		apiUrl: API_URL,
		userAgent: USER_AGENT,
		networkProbe,
		counts,
		total,
		errors: categoryErrors,
	});

	if (!ok) {
		console.error(
			"[bangumi] 一条数据都没抓到，放弃写入数据文件（避免覆盖已有数据）",
		);
		process.exit(1);
	}

	const payload = {
		generatedAt: new Date().toISOString(),
		userId: USER_ID,
		apiUrl: API_URL,
		counts,
		categories,
	};

	fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
	fs.writeFileSync(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
	console.log(
		`[bangumi] 已写入 ${OUT_FILE}，共 ${total} 条：${JSON.stringify(counts)}`,
	);
}

main().catch((err) => {
	console.error("[bangumi] 失败：", err);
	try {
		writeStatus({
			lastRunAt: new Date().toISOString(),
			ok: false,
			fatal: describeError(err),
		});
	} catch (e) {
		console.error("[bangumi] 写诊断文件也失败了：", e);
	}
	process.exit(1);
});

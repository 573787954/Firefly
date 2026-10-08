#!/usr/bin/env node
/**
 * 抓取 Bangumi 收藏数据，写入本地 JSON 文件
 *
 * 为什么需要它：
 *   本机网络对 Bangumi 系域名存在 SNI 阻断（api.bgm.tv / api.bangumi.pro / api.bangumi.one 全部无法访问），
 *   浏览器端 dynamic 模式因此必然拉取失败。改用 GitHub Actions 定时运行本脚本——
 *   GitHub 的服务器能正常访问 Bangumi，抓到的数据提交进仓库，站点直接读本地 JSON。
 *
 * 用法：
 *   node scripts/fetch-bangumi.mjs
 *
 * 可用环境变量覆盖：
 *   BANGUMI_USER_ID   —— 用户 UID，默认 1288644
 *   BANGUMI_API_URL   —— 接口地址，默认 https://api.bgm.tv
 *   BANGUMI_OUT       —— 输出路径，默认 src/constants/bangumi-data.json
 */

import fs from "node:fs";
import path from "node:path";

const USER_ID = process.env.BANGUMI_USER_ID || "1288644";
const API_URL = process.env.BANGUMI_API_URL || "https://api.bgm.tv";
const OUT_FILE = process.env.BANGUMI_OUT || "src/constants/bangumi-data.json";

// Bangumi 官方要求带上可识别的 User-Agent
const USER_AGENT = "573787954-blog/1.0 (https://github.com/573787954/Firefly)";

// 分类 → Bangumi subject_type
const CATEGORIES = { book: 1, anime: 2, music: 3, game: 4 };

const PAGE_LIMIT = 50;
const MAX_TOTAL = 3000;
const RETRY = 3;
const PAGE_DELAY = 400;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
	console.log(`[bangumi] 抓取用户 ${USER_ID} 的收藏（接口 ${API_URL}）`);

	const categories = {};
	for (const [key, subjectType] of Object.entries(CATEGORIES)) {
		try {
			categories[key] = await fetchCategory(key, subjectType);
		} catch (err) {
			console.error(`[bangumi] 分类 ${key} 抓取失败：${err.message}`);
			categories[key] = [];
		}
	}

	const total = Object.values(categories).reduce((n, arr) => n + arr.length, 0);
	if (total === 0) {
		console.error("[bangumi] 一条数据都没抓到，放弃写入（避免覆盖已有数据）");
		process.exit(1);
	}

	const payload = {
		generatedAt: new Date().toISOString(),
		userId: USER_ID,
		apiUrl: API_URL,
		counts: Object.fromEntries(
			Object.entries(categories).map(([k, v]) => [k, v.length]),
		),
		categories,
	};

	fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
	fs.writeFileSync(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
	console.log(
		`[bangumi] 已写入 ${OUT_FILE}，共 ${total} 条：${JSON.stringify(payload.counts)}`,
	);
}

main().catch((err) => {
	console.error("[bangumi] 失败：", err);
	process.exit(1);
});

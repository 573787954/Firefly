import type {
	ImageMascotConfig,
	Live2DWidgetConfig,
	SpineModelConfig,
} from "../types/pioConfig";

// Spine 看板娘配置
export const spineModelConfig: SpineModelConfig = {
	// Spine 看板娘开关
	enable: false,

	// Spine模型配置
	model: {
		// Spine模型文件路径
		path: "/pio/models/spine/firefly/1310.json",
		// 模型缩放比例
		scale: 1.0,
		// X轴偏移
		x: 0,
		// Y轴偏移
		y: 0,
	},

	// 位置配置
	position: {
		// 显示位置 bottom-left，bottom-right，top-left，top-right，注意：在右下角可能会挡住返回顶部按钮
		corner: "bottom-left",
		// 距离边缘0px
		offsetX: 0,
		// 距离下边缘0px
		offsetY: 0,
	},

	// 尺寸配置
	size: {
		// 容器宽度
		width: 135,
		// 容器高度
		height: 165,
	},

	// 交互配置
	interactive: {
		// 交互功能开关
		enabled: true,
		// 点击时随机播放的动画列表
		clickAnimations: [
			"emoji_0",
			"emoji_1",
			"emoji_2",
			"emoji_3",
			"emoji_4",
			"emoji_5",
		],
		// 点击时随机显示的文字消息
		clickMessages: [
			"你好呀！我是流萤~",
			"今天也要加油哦！✨",
			"想要一起去看星空吗？🌟",
			"记得要好好休息呢~",
			"有什么想对我说的吗？💫",
			"让我们一起探索未知的世界吧！🚀",
			"每一颗星星都有自己的故事~⭐",
			"希望能带给你温暖和快乐！💖",
		],
		// 文字显示时间（毫秒）
		messageDisplayTime: 3000,
		// 待机动画列表
		idleAnimations: ["idle", "emoji_0", "emoji_1", "emoji_3", "emoji_4"],
		// 待机动画切换间隔（毫秒）
		idleInterval: 8000,
	},

	// 响应式配置
	responsive: {
		// 在移动端隐藏
		hideOnMobile: true,
		// 移动端断点
		mobileBreakpoint: 768,
	},

	// 层级
	zIndex: 1000, // 层级

	// 透明度
	opacity: 1.0,
};

// Live2D 看板娘配置 (使用 l2d-widget 库，文档：https://l2d-widget.hacxy.cn)
export const live2dWidgetConfig: Live2DWidgetConfig = {
	// Live2D 看板娘开关（已改用下面的静态图片看板娘，因此关闭）
	enable: false,
	// 模型配置，支持单个模型或数组（多模型切换）
	// 这里只用仓库里的本地模型，避免依赖外部 CDN（本机网络对部分境外域名有阻断）
	model: [
		{
			// Live2D模型本地文件路径
			path: "/pio/models/live2d/snow_miku/model.json",
			// 动作声音音量 范围0~1，默认 0（静音）
			volume: 0,
			// 模型缩放比例
			scale: 1,
			// X轴偏移，范围 -2~2，正值向右
			x: 0,
			// Y轴偏移，范围 -2~2，正值向上
			y: 0,
		},
	],
	// 显示位置：bottom-left 或 bottom-right
	position: "bottom-left" as const,
	// 画布尺寸（px）
	size: { width: 200, height: 200 },
	// 主题色，用于菜单、状态条等 UI 元素的背景色，默认 'rgba(96,165,250,0.9)'
	primaryColor: "var(--l2d-msg-bg)",
	// 入场/退场动画时长（ms）
	transitionDuration: 1500,
	// 入场/退场动画类型
	transitionType: "slide" as const,
	// 菜单配置
	menus: {
		// 完全替换默认菜单项
		items: [
			{
				icon: "mdi:home",
				label: "返回主页",
				action: "home",
			},
			{
				icon: "mdi:arrow-up",
				label: "返回顶部",
				action: "scrollToTop",
			},
			{
				icon: "mdi:bed",
				label: "休眠",
				action: "sleep",
			},
			{
				icon: "mdi:swap-horizontal",
				label: "切换模型",
				action: "switchModel",
			},
			{
				// 看板娘可以直接拖动（位置记在浏览器里），拖歪了点这里还原
				icon: "mdi:restore",
				label: "重置位置",
				action: "resetPosition",
			},
			{
				icon: "mdi:github",
				label: "GitHub",
				action: "github",
			},
		],
		// 菜单对齐方式
		align: "right" as const,
	},
	// 提示气泡配置
	tips: {
		// 气泡开关
		enable: true,
		// 初始欢迎消息
		welcomeMessage: ["你好呀！", "欢迎来到我的世界！"],
		// 循环提示内容
		messages: [
			"有什么需要帮助的吗？",
			"今天天气真不错呢！",
			"要不要一起玩游戏？",
			"记得按时休息哦！",
		],
		// 文字显示时间（ms）
		duration: 3000,
		// 提示气泡切换间隔（ms）
		interval: 6000,
		// 位置偏移量（px），基于默认位置（模型正上方居中）进行微调
		offset: {
			x: 0, // 正值右移，负值左移
			y: 0, // 正值下移，负值上移
		},
	},
	// 响应式配置
	responsive: {
		// 在移动端隐藏
		hideOnMobile: true,
		// 移动端断点
		mobileBreakpoint: 768,
	},
};

// 静态图片看板娘配置
// 说明：Live2D / Spine 都需要带骨骼绑定的模型文件，一张平面插画无法作为 Live2D 模型渲染；
//       如果你只有图片（PNG/WebP），就用这一项——支持透明底、可拖动、点击弹菜单。
export const imageMascotConfig: ImageMascotConfig = {
	// 开关
	enable: true,
	// 图片路径（放在 public 目录下，用 / 开头的路径）
	image: "/assets/images/mascot-amiya.webp",
	// 显示宽度（px），高度按图片比例自适应
	width: 200,
	// 默认停留角落：bottom-left | bottom-right | top-left | top-right
	corner: "bottom-left",
	// 距边缘的间距（px）
	offset: { x: 16, y: 16 },
	// 是否允许拖动（拖动后的位置记在浏览器本地，刷新后保持；菜单里有「重置位置」还原）
	draggable: true,
	// 层级
	zIndex: 999,
	// 点击看板娘弹出的菜单（action 支持 home / scrollToTop / resetPosition / hide）
	menus: {
		align: "left",
		items: [
			{ icon: "mdi:home", label: "返回主页", action: "home" },
			{ icon: "mdi:arrow-up", label: "返回顶部", action: "scrollToTop" },
			{ icon: "mdi:restore", label: "重置位置", action: "resetPosition" },
			{ icon: "mdi:eye-off-outline", label: "隐藏", action: "hide" },
		],
	},
	// 点击时随机显示的一句话
	tips: {
		enable: true,
		messages: [
			"你好呀，我是这里的看板娘～",
			"可以把我的拖到任意位置哦",
			"记得常来看看！",
			"今天也要加油鸭 ✨",
		],
		duration: 3000,
	},
	// 移动端隐藏
	responsive: { hideOnMobile: true, mobileBreakpoint: 768 },
};

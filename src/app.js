const CANVAS_WIDTH = 864;
const CANVAS_HEIGHT = 1152;
const CANVAS_RENDER_SCALE = 2;
const OUTPUT_CANVAS_WIDTH = CANVAS_WIDTH * CANVAS_RENDER_SCALE;
const OUTPUT_CANVAS_HEIGHT = CANVAS_HEIGHT * CANVAS_RENDER_SCALE;
// 实况成片固定 1080x1440，服务端 ffmpeg 也按这个尺寸缩放卡片。
const LIVE_PAGE_WIDTH = 1080;
const LIVE_PAGE_HEIGHT = 1440;
const CARD_SIDE_PADDING = 42;
const CARD_CONTENT_WIDTH = CANVAS_WIDTH - CARD_SIDE_PADDING * 2;
const CARD_MAX_IMAGE_HEIGHT = CANVAS_HEIGHT - CARD_SIDE_PADDING - 62;
// 页脚：分割线下方左侧标题、右侧页码，正文需在分割线以上留出间距
const CARD_FOOTER_DIVIDER_Y = CANVAS_HEIGHT - 74;
const CARD_FOOTER_TEXT_Y = CANVAS_HEIGHT - 37;
const CARD_CONTENT_BOTTOM = CARD_FOOTER_DIVIDER_Y - 20;
const DEFAULT_CARD_FONT_SIZE = 34;
const DEFAULT_CARD_LINE_HEIGHT = 1.85;
// {{size:N|文字}} 的 N 按卡片逻辑像素计；长文按正文字号等比换算。
const INLINE_FONT_SIZE_MIN = 12;
const INLINE_FONT_SIZE_MAX = 120;
const UNDERLINE_GAP = 15;
const CARD_BODY_FONT_WEIGHT = 400;
const CARD_BODY_STROKE_WIDTH = 0;
const EXPORT_IMAGE_MIME = "image/png";
const DEFAULT_HANDLE = "@X: iamcora13";
const EXPORT_IMAGE_EXTENSION = ".png";
const EXPORT_ZIP_COMPRESSION = "STORE";
const LIVE_PHOTO_API_BASE = window.location.protocol === "file:" ? "http://127.0.0.1:5173" : "";
const LIVE_PHOTO_LOCAL_GUIDE_URL = "https://github.com/fxyadela/write-then-publish#本地运行";
const OBSIDIAN_VAULT_DB = "writeThenPublishObsidianVault";
const OBSIDIAN_VAULT_STORE = "settings";
const OBSIDIAN_VAULT_KEY = "directoryHandle";
const LIVE_MEDIA_DB = "writeThenPublishLiveMedia";
const LIVE_MEDIA_STORE = "videos";
const IMAGE_MEDIA_STORE = "images";
const STORAGE_KEY = "graphicTextLayoutState.v1";
const PROJECTS_STORAGE_KEY = "graphicTextLayoutProjects.v1";
const AUTHOR_PROFILE_STORAGE_KEY = "writeThenPublishAuthorProfile.v1";
const CUSTOM_COLOR_PALETTE_STORAGE_KEY = "writeThenPublishCustomColorPalette.v1";
const PANEL_LAYOUT_STORAGE_KEY = "writeThenPublishPanelLayout.v1";
const ARTICLE_CUSTOM_THEME_STORAGE_KEY = "writeThenPublishArticleCustomTheme.v1";
const DEFAULT_ARTICLE_THEME = "wechat";
const DEFAULT_ARTICLE_CODE_THEME = "github-dark";
const ARTICLE_CUSTOM_THEME = "custom";
// 字号按比例缩放主题里写死的字号，任何主题都适用
const ARTICLE_SIZE_SCALES = { small: 0.9, normal: 1, large: 1.1, xlarge: 1.2 };
const DEFAULT_ARTICLE_SIZE = "normal";
const ONBOARDING_STORAGE_KEY = "writeThenPublishOnboarding.v1";
const ENTRY_MODE_SESSION_KEY = "writeThenPublishEntryMode.v1";
const LAST_ACCOUNT_EMAIL_KEY = "writeThenPublishLastAccountEmail.v1";
const ACCOUNT_SESSIONS_STORAGE_KEY = "writeThenPublishAccountSessions.v1";
const MAX_STORED_ACCOUNT_SESSIONS = 6;
const GOOGLE_OAUTH_PENDING_SESSION_KEY = "writeThenPublishGoogleOauthPending.v1";
const ACCOUNT_ADD_PENDING_SESSION_KEY = "writeThenPublishAccountAddPending.v1";
const EXPERIENCE_VERSION = "2026.08";
const WELCOME_BACK_STORAGE_KEY = "writeThenPublishWelcomeBackVersion.v1";
const WHATS_NEW_STORAGE_KEY = "writeThenPublishWhatsNewVersion.v1";
const FEEDBACK_ENDPOINT = "https://formsubmit.co/ajax/heytomato@gmail.com";
const FEEDBACK_VERSION = "20260815-feedback-underline";
const FEEDBACK_MAX_FILES = 3;
const FEEDBACK_MAX_FILE_BYTES = 5 * 1024 * 1024;
const FEEDBACK_MAX_TOTAL_BYTES = 8 * 1024 * 1024;
const FEEDBACK_ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const LOCAL_DEPLOYMENT_MODE = document.documentElement.dataset.writeThenPublishLocalMode === "true";
const MIGRATION_END_AT = Date.parse("2026-11-01T00:00:00+08:00");
const MIGRATION_DEADLINE_NOTICE = "请在 10 月 31 日结束前完成迁移，并妥善保留 ZIP 原稿。";
let ACCOUNT_MAINTENANCE = Date.now() < MIGRATION_END_AT;
const MAINTENANCE_WELCOME_KEY = "writeThenPublishMaintenanceWelcome.v4";
const MIGRATION_AUTH_PENDING_KEY = "writeThenPublishMigrationAuthPending.v1";
const MIGRATION_RECEIPTS_KEY = "writeThenPublishMigrationReceipts.v1";
const MIGRATION_TEST_MODE = !LOCAL_DEPLOYMENT_MODE;
let activeStorageScope = "guest";
let migrationTestAuthMode = "signin";

function isMigrationTestUser(user) {
  return MIGRATION_TEST_MODE && ACCOUNT_MAINTENANCE && Boolean(user?.id) && user.is_anonymous !== true;
}

async function resolveAccountPolicy() {
  if (LOCAL_DEPLOYMENT_MODE) return;
  let remaining = MIGRATION_END_AT - Date.now();
  let timeout;
  try {
    const policy = await Promise.race([
      cloudApi()?.getAccountPolicy(),
      new Promise((_, reject) => { timeout = window.setTimeout(() => reject(new Error("账号服务暂不可达")), 5000); }),
    ]);
    if (typeof policy?.migration_open === "boolean") ACCOUNT_MAINTENANCE = policy.migration_open;
    const serverTime = Date.parse(policy?.server_time);
    if (Number.isFinite(serverTime)) remaining = MIGRATION_END_AT - serverTime;
  } catch { /* 服务暂不可达时，后端权限仍负责截止时间。 */ }
  finally { window.clearTimeout(timeout); }
  const localPreview = ["localhost", "127.0.0.1"].includes(window.location.hostname)
    && new URLSearchParams(window.location.search).get("account-preview") === "profile";
  if (localPreview) ACCOUNT_MAINTENANCE = false;
  if (ACCOUNT_MAINTENANCE) {
    window.setTimeout(() => {
      saveState();
      window.location.reload();
    }, Math.max(1000, Math.min(2147483647, remaining + 1000)));
  }
}

function scopedStorageKey(baseKey, scope = activeStorageScope) {
  return scope === "local" ? baseKey : `${baseKey}.${scope}`;
}

// 游客稿件也放 localStorage，关掉浏览器后原稿列表仍在；键名带 .guest 后缀，和账号数据分开。
function storageForScope() {
  return localStorage;
}

// 游客稿件以前存在 sessionStorage：读取时把当前标签页里的旧数据并入 localStorage，只搬一次。
function migrateGuestSessionStore() {
  for (const baseKey of [PROJECTS_STORAGE_KEY, STORAGE_KEY, CUSTOM_COLOR_PALETTE_STORAGE_KEY]) {
    const key = scopedStorageKey(baseKey, "guest");
    try {
      const legacy = sessionStorage.getItem(key);
      if (!legacy) continue;
      const current = localStorage.getItem(key);
      if (!current) {
        localStorage.setItem(key, legacy);
      } else if (baseKey === PROJECTS_STORAGE_KEY) {
        const stored = JSON.parse(current);
        const incoming = JSON.parse(legacy);
        const known = new Set((stored.projects || []).map((project) => project?.id));
        const merged = [...(stored.projects || []), ...(incoming.projects || []).filter((project) => !known.has(project?.id))]
          .sort((a, b) => (Number(b?.updatedAt) || 0) - (Number(a?.updatedAt) || 0))
          .slice(0, MAX_PROJECTS);
        localStorage.setItem(key, JSON.stringify({ ...stored, projects: merged }));
      }
      sessionStorage.removeItem(key);
    } catch {
      // 隐私模式或配额不足时保留 sessionStorage 原样，下次再试。
    }
  }
}

function livePhotoApiUrl(path) {
  return `${LIVE_PHOTO_API_BASE}${path}`;
}

function cloudLivePhotoAvailable() {
  // 迁移期不创建新的云端任务或上传原视频。
  return false;
}

function needsLivePhotoStaticFallback() {
  // 浏览器自己能合成实况时，既不需要本机服务也不需要云端，不该再提示“无法生成实况”。
  if (window.WriteThenPublishBrowserLivePhoto?.supported()) return false;
  const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
  if (window.location.protocol === "file:") return true;
  return /^https?:$/.test(window.location.protocol)
    && !localHosts.has(window.location.hostname)
    && !cloudLivePhotoAvailable();
}
const MAX_PROJECTS = 24;
const MAX_SAVED_CUSTOM_COLORS = 12;
const BUILT_IN_PROJECT_PREFIX = "guide_";
const GUIDE_CARDS_PROJECT_ID = `${BUILT_IN_PROJECT_PREFIX}cards`;
const GUIDE_ARTICLE_PROJECT_ID = `${BUILT_IN_PROJECT_PREFIX}article`;
const PANEL_LIMITS = {
  history: { min: 210, max: 380, fallback: 260 },
  editor: { min: 360, max: 760, fallback: 500 },
};

const $ = (selector) => document.querySelector(selector);

const els = {
  workspace: $(".workspace"),
  content: $("#contentInput"),
  pages: $("#pages"),
  pageCount: $("#pageCount"),
  draftTitle: $("#draftTitleInput"),
  status: $("#statusText"),
  exportProgress: $("#exportProgress"),
  exportProgressTitle: $("#exportProgressTitle"),
  exportProgressDetail: $("#exportProgressDetail"),
  exportProgressPercent: $("#exportProgressPercent"),
  exportProgressMeta: $("#exportProgressMeta"),
  exportProgressBar: $("#exportProgressBar"),
  exportProgressFill: $("#exportProgressFill"),
  historySidebar: $("#historySidebar"),
  historyToggle: $("#historyToggleBtn"),
  historyClose: $("#historyCloseBtn"),
  syncFolderDrafts: $("#syncFolderDraftsBtn"),
  newProject: $("#newProjectBtn"),
  portableImportOpen: $("#portableImportOpenBtn"),
  projectHistory: $("#projectHistory"),
  historyFilterButtons: document.querySelectorAll("[data-history-filter]"),
  panelResizers: document.querySelectorAll("[data-panel-resize]"),
  modeButtons: document.querySelectorAll(".mode-switch [data-app-mode]"),
  convertMode: $("#convertModeBtn"),
  headerModeToggle: $("#headerModeToggleBtn"),
  themeToggle: $("#themeToggleBtn"),
  account: $("#accountBtn"),
  accountLabel: $("#accountButtonLabel"),
  accountDock: $("#accountDock"),
  accountMenu: $("#accountMenu"),
  accountMenuTitle: $("#accountMenuTitle"),
  accountMenuDescription: $("#accountMenuDescription"),
  accountMenuLogin: $("#accountMenuLoginBtn"),
  accountMenuManage: $("#accountMenuManageBtn"),
  accountMenuSwitch: $("#accountMenuSwitchBtn"),
  accountMenuSignOut: $("#accountMenuSignOutBtn"),
  accountMenuWhatsNew: $("#accountMenuWhatsNewBtn"),
  portableExport: $("#portableExportBtn"),
  saveToProject: $("#saveToProjectBtn"),
  portableImportModal: $("#portableImportModal"),
  portableImportClose: $("#portableImportCloseBtn"),
  portableImportDropzone: $("#portableImportDropzone"),
  portableImportStatus: $("#portableImportStatus"),
  portableImportPreview: $("#portableImportPreview"),
  portableImportChoice: $("#portableImportChoice"),
  portableImportChoiceSelect: $("#portableImportChoiceSelect"),
  portableImportName: $("#portableImportName"),
  portableImportDetails: $("#portableImportDetails"),
  portableImportWarning: $("#portableImportWarning"),
  portableImportConfirm: $("#portableImportConfirmBtn"),
  portableImportZip: $("#portableImportZipBtn"),
  portableImportFolder: $("#portableImportFolderBtn"),
  portableImportZipInput: $("#portableImportZipInput"),
  portableImportMarkdown: $("#portableImportMarkdownBtn"),
  portableImportMarkdownInput: $("#portableImportMarkdownInput"),
  portableImportFolderInput: $("#portableImportFolderInput"),
  cloudMigration: $("#cloudMigrationBtn"),
  cloudMigrationModal: $("#cloudMigrationModal"),
  cloudMigrationClose: $("#cloudMigrationCloseBtn"),
  cloudMigrationRefresh: $("#cloudMigrationRefreshBtn"),
  cloudMigrationAll: $("#cloudMigrationAllBtn"),
  cloudMigrationBrowserDownload: $("#cloudMigrationBrowserDownloadBtn"),
  cloudMigrationAllLabel: $("#cloudMigrationAllLabel"),
  cloudMigrationProgress: $("#cloudMigrationProgress"),
  cloudMigrationProgressLabel: $("#cloudMigrationProgressLabel"),
  cloudMigrationProgressPercent: $("#cloudMigrationProgressPercent"),
  cloudMigrationProgressTrack: $("#cloudMigrationProgressTrack"),
  cloudMigrationProgressFill: $("#cloudMigrationProgressFill"),
  cloudMigrationProgressDetail: $("#cloudMigrationProgressDetail"),
  cloudMigrationStatus: $("#cloudMigrationStatus"),
  cloudMigrationList: $("#cloudMigrationList"),
  migrationTestModal: $("#migrationTestModal"),
  migrationTestClose: $("#migrationTestCloseBtn"),
  migrationTestGoogle: $("#migrationTestGoogleBtn"),
  migrationTestSignInMode: $("#migrationTestSignInModeBtn"),
  migrationTestSignUpMode: $("#migrationTestSignUpModeBtn"),
  migrationTestEmailForm: $("#migrationTestEmailForm"),
  migrationTestEmail: $("#migrationTestEmail"),
  migrationTestPassword: $("#migrationTestPassword"),
  migrationTestEmailSignIn: $("#migrationTestEmailSignInBtn"),
  migrationTestNotice: $("#migrationTestNotice"),
  migrationTestControls: $("#migrationTestControls"),
  migrationTestOpen: $("#migrationTestOpenBtn"),
  migrationTestSignOut: $("#migrationTestSignOutBtn"),
  accountMenuSwitchSection: $("#accountMenuSwitchSection"),
  accountMenuAccountList: $("#accountMenuAccountList"),
  accountMenuAdd: $("#accountMenuAddBtn"),
  accountMenuHint: $("#accountMenuHint"),
  accountModal: $("#accountModal"),
  accountClose: $("#accountCloseBtn"),
  accountConfigNotice: $("#accountConfigNotice"),
  accountGuestFallback: $("#accountGuestFallbackBtn"),
  accountResendConfirmation: $("#accountResendConfirmationBtn"),
  accountOauth: $("#accountOauth"),
  accountGoogle: $("#accountGoogleBtn"),
  accountForgotPassword: $("#accountForgotPasswordBtn"),
  accountNewPasswordField: $("#accountNewPasswordField"),
  accountNewPassword: $("#accountNewPasswordInput"),
  accountAuthForm: $("#accountAuthForm"),
  accountEmail: $("#accountEmailInput"),
  accountPassword: $("#accountPasswordInput"),
  accountPasswordToggle: $("#accountPasswordToggleBtn"),
  accountPasswordConfirmField: $("#accountPasswordConfirmField"),
  accountPasswordConfirm: $("#accountPasswordConfirmInput"),
  accountSignInMode: $("#accountSignInModeBtn"),
  accountSignIn: $("#accountSignInBtn"),
  accountSignUp: $("#accountSignUpBtn"),
  accountSignedIn: $("#accountSignedIn"),
  accountAvatar: $("#accountAvatar"),
  accountDisplayName: $("#accountDisplayName"),
  accountEmailLabel: $("#accountEmail"),
  accountSyncStatus: $("#accountSyncStatus"),
  accountModalAccountList: $("#accountModalAccountList"),
  accountAddAnother: $("#accountAddAnotherBtn"),
  accountImportLocal: $("#accountImportLocalBtn"),
  accountSignOut: $("#accountSignOutBtn"),
  entryChoiceModal: $("#entryChoiceModal"),
  entryChoiceLoading: $("#entryChoiceLoading"),
  entryChoiceContent: $("#entryChoiceContent"),
  entryChoiceNotice: $("#entryChoiceNotice"),
  entryChoiceReturningHint: $("#entryChoiceReturningHint"),
  chooseGuest: $("#chooseGuestBtn"),
  chooseLogin: $("#chooseLoginBtn"),
  maintenanceWelcome: $("#maintenanceWelcomeModal"),
  maintenanceWelcomeStart: $("#maintenanceWelcomeStartBtn"),
  maintenanceWelcomeMigrate: $("#maintenanceWelcomeMigrateBtn"),
  maintenanceWelcomeAccount: $("#maintenanceWelcomeAccountBtn"),
  maintenanceAnnouncement: $(".maintenance-announcement"),
  maintenanceWelcomeGuide: $(".maintenance-welcome-guide"),
  entryChoiceMigration: $("#entryChoiceMigrationBtn"),
  welcomeBackModal: $("#welcomeBackModal"),
  welcomeBackClose: $("#welcomeBackCloseBtn"),
  welcomeBackAccountState: $("#welcomeBackAccountState"),
  welcomeBackDirect: $("#welcomeBackDirectBtn"),
  welcomeBackTour: $("#welcomeBackTourBtn"),
  feedback: $("#feedbackBtn"),
  feedbackModal: $("#feedbackModal"),
  feedbackClose: $("#feedbackCloseBtn"),
  feedbackCancel: $("#feedbackCancelBtn"),
  feedbackForm: $("#feedbackForm"),
  feedbackMessage: $("#feedbackMessageInput"),
  feedbackMessageCount: $("#feedbackMessageCount"),
  feedbackContact: $("#feedbackContactInput"),
  feedbackImageInput: $("#feedbackImageInput"),
  feedbackUploadDropzone: $("#feedbackUploadDropzone"),
  feedbackImageList: $("#feedbackImageList"),
  feedbackNotice: $("#feedbackNotice"),
  feedbackSubmit: $("#feedbackSubmitBtn"),
  downloadZip: $("#downloadZipBtn"),
  downloadArticle: $("#downloadArticleBtn"),
  downloadPdf: $("#downloadPdfBtn"),
  downloadMenu: $("#downloadMenu"),
  copyWechat: $("#copyWechatBtn"),
  copyFeishu: $("#copyFeishuBtn"),
  syncWechat: $("#syncWechatBtn"),
  articleSettings: $("#articleSettings"),
  articleThemeList: $("#articleThemeList"),
  articleCodeThemeList: $("#articleCodeThemeList"),
  articleMacCode: $("#articleMacCodeInput"),
  articleSizeList: $("#articleSizeList"),
  articleCssToggle: $("#articleCssToggleBtn"),
  articleCssPanel: $("#articleCssPanel"),
  articleCssEditor: $("#articleCssEditor"),
  articleCssStatus: $("#articleCssStatus"),
  articleThemeStyle: $("#articleThemeStyle"),
  contentImage: $("#contentImageInput"),
  copyPlainText: $("#copyPlainTextBtn"),
  clearInlineStyles: $("#clearInlineStylesBtn"),
  emojiMenu: $("#emojiMenu"),
  emojiGrid: $("#emojiGrid"),
  contentVideo: $("#contentVideoInput"),
  obsidianImportMenu: $("#obsidianImportMenu"),
  connectObsidianVault: $("#connectObsidianVaultBtn"),
  syncObsidianVault: $("#syncObsidianVaultBtn"),
  obsidianVaultFolder: $("#obsidianVaultFolderInput"),
  obsidianVaultStatus: $("#obsidianVaultStatus"),
  inlineColor: $("#inlineColorInput"),
  inlineBgColor: $("#inlineBgColorInput"),
  colorMenu: $("#colorMenu"),
  bgColorMenu: $("#bgColorMenu"),
  underlineMenu: $("#underlineMenu"),
  sizeMenu: $("#sizeMenu"),
  colorTool: $(".color-tool"),
  bgColorTool: $(".bg-color-tool"),
  selectionToolbar: $("#selectionToolbar"),
  selectionColorBtn: $("#selectionColorBtn"),
  selectionBgColorBtn: $("#selectionBgColorBtn"),
  selectionUnderlineBtn: $("#selectionUnderlineBtn"),
  selectionColorPalette: $("#selectionColorPalette"),
  selectionBgPalette: $("#selectionBgPalette"),
  selectionUnderlinePalette: $("#selectionUnderlinePalette"),
  selectionSizeBtn: $("#selectionSizeBtn"),
  selectionSizePalette: $("#selectionSizePalette"),
  selectionColorSwatches: $("#selectionColorSwatches"),
  selectionBgSwatches: $("#selectionBgSwatches"),
  selectionCustomColor: $("#selectionCustomColorInput"),
  selectionCustomBg: $("#selectionCustomBgInput"),
  selectionColorDot: $("#selectionColorDot"),
  selectionBgColorDot: $("#selectionBgColorDot"),
  find: $("#findInput"),
  replace: $("#replaceInput"),
  searchMenu: $("#searchMenu"),
  findMatchCount: $("#findMatchCount"),
  findNext: $("#findNextBtn"),
  replaceOne: $("#replaceOneBtn"),
  replaceAll: $("#replaceAllBtn"),
  avatarInput: $("#avatarInput"),
  avatarPreview: $("#avatarPreview"),
  cropAvatar: $("#cropAvatarBtn"),
  imageList: $("#imageList"),
  imageWidthPercent: $("#imageWidthPercentInput"),
  applyImageWidth: $("#applyImageWidthBtn"),
  fixedImageWidth: $("#fixedImageWidthInput"),
  fixedImageHeight: $("#fixedImageHeightInput"),
  applyFixedImageSize: $("#applyFixedImageSizeBtn"),
  displayName: $("#displayNameInput"),
  handle: $("#handleInput"),
  textColor: $("#textColorInput"),
  accentColor: $("#accentColorInput"),
  bgColor: $("#bgColorInput"),
  fontSize: $("#fontSizeInput"),
  lineHeight: $("#lineHeightInput"),
  zhFont: $("#zhFontInput"),
  enFont: $("#enFontInput"),
  imageHeight: $("#imageHeightInput"),
  bgPattern: $("#bgPatternInput"),
  bgThemeMenu: $("#bgThemeMenu"),
  bgThemeGrid: $("#bgThemeGrid"),
  pairModal: $("#pairModal"),
  pairClose: $("#pairCloseBtn"),
  pairCanvasLeft: $("#pairCanvasLeft"),
  pairCanvasRight: $("#pairCanvasRight"),
  pairCropLeft: $("#pairCropLeftBtn"),
  pairCropRight: $("#pairCropRightBtn"),
  pairDropLeft: $("#pairDropLeftBtn"),
  pairDropRight: $("#pairDropRightBtn"),
  pairSwap: $("#pairSwapBtn"),
  pairDone: $("#pairDoneBtn"),
  pairRatioButtons: document.querySelectorAll("[data-pair-ratio]"),
  cropModal: $("#cropModal"),
  cropCanvas: $("#cropCanvas"),
  cropTitle: $("#cropTitle"),
  cropSubtitle: $("#cropSubtitle"),
  cropClose: $("#cropCloseBtn"),
  cropApply: $("#cropApplyBtn"),
  cropReset: $("#cropResetBtn"),
  ratioButtons: document.querySelectorAll("[data-ratio]"),
  wechatModal: $("#wechatModal"),
  wechatClose: $("#wechatCloseBtn"),
  wechatCancel: $("#wechatCancelBtn"),
  wechatConfirm: $("#wechatConfirmBtn"),
  wechatTitle: $("#wechatTitleInput"),
  wechatAuthor: $("#wechatAuthorInput"),
  wechatCover: $("#wechatCoverInput"),
  wechatCoverPreview: $("#wechatCoverPreview"),
  wechatCoverHint: $("#wechatCoverHint"),
  wechatServiceStatus: $("#wechatServiceStatus"),
  livePhotoModal: $("#livePhotoModal"),
  livePhotoClose: $("#livePhotoCloseBtn"),
  livePhotoCancel: $("#livePhotoCancelBtn"),
  livePhotoForm: $("#livePhotoForm"),
  livePhotoPreview: $("#livePhotoPreview"),
  livePhotoVideo: $("#livePhotoVideo"),
  livePhotoCropCanvas: $("#livePhotoCropCanvas"),
  livePhotoEmpty: $("#livePhotoEmpty"),
  livePhotoVideoInput: $("#livePhotoVideoInput"),
  livePhotoFileLabel: $("#livePhotoFileLabel"),
  livePhotoFileSwap: $("#livePhotoFileSwap"),
  livePhotoVideoMeta: $("#livePhotoVideoMeta"),
  livePhotoDurationButtons: document.querySelectorAll("[data-live-duration]"),
  livePhotoSpeedButtons: document.querySelectorAll("[data-live-speed]"),
  livePhotoSpeedHint: $("#livePhotoSpeedHint"),
  livePhotoRatioButtons: document.querySelectorAll("[data-live-ratio]"),
  livePhotoCustomRatioRow: $("#livePhotoCustomRatioRow"),
  livePhotoCustomRatio: $("#livePhotoCustomRatioInput"),
  livePhotoCustomRatioOutput: $("#livePhotoCustomRatioOutput"),
  livePhotoDurationHint: $("#livePhotoDurationHint"),
  livePhotoStart: $("#livePhotoStartInput"),
  livePhotoCover: $("#livePhotoCoverInput"),
  livePhotoSound: $("#livePhotoSoundInput"),
  livePhotoTrimRow: $("#livePhotoTrimRow"),
  livePhotoTrimOutput: $("#livePhotoTrimOutput"),
  livePhotoTrimHint: $("#livePhotoTrimHint"),
  livePhotoTrimTrack: $("#livePhotoTrimTrack"),
  livePhotoTrimStrip: $("#livePhotoTrimStrip"),
  livePhotoTrimWindow: $("#livePhotoTrimWindow"),
  livePhotoServiceStatus: $("#livePhotoServiceStatus"),
  livePhotoGenerate: $("#livePhotoGenerateBtn"),
  livePhotoHandoffModal: $("#livePhotoHandoffModal"),
  livePhotoHandoffTitle: $("#livePhotoHandoffTitle"),
  livePhotoHandoffClose: $("#livePhotoHandoffCloseBtn"),
  livePhotoHandoffReveal: $("#livePhotoHandoffRevealBtn"),
  livePhotoHandoffAirdrop: $("#livePhotoHandoffAirdropBtn"),
  livePhotoHandoffDownload: $("#livePhotoHandoffDownloadBtn"),
  livePhotoHandoffSummary: $("#livePhotoHandoffSummary"),
  livePhotoHandoffPreview: $("#livePhotoHandoffPreview"),
  livePhotoHandoffPreviewHint: $("#livePhotoHandoffPreviewHint"),
  livePhotoHandoffThumbnails: $("#livePhotoHandoffThumbnails"),
  livePhotoHandoffDevice: $("#livePhotoHandoffDevice"),
  livePhotoHandoffDeviceLabel: $("#livePhotoHandoffDeviceLabel"),
  livePhotoHandoffCount: $("#livePhotoHandoffCount"),
  livePhotoHandoffDetail: $("#livePhotoHandoffDetail"),
  livePhotoHandoffFiles: $("#livePhotoHandoffFiles"),
  livePhotoHandoffHint: $("#livePhotoHandoffHint"),
  livePhotoHandoffProgress: $("#livePhotoHandoffProgress"),
  livePhotoHandoffProgressTitle: $("#livePhotoHandoffProgressTitle"),
  livePhotoHandoffProgressDetail: $("#livePhotoHandoffProgressDetail"),
  livePhotoHandoffProgressPercent: $("#livePhotoHandoffProgressPercent"),
  livePhotoHandoffProgressMeta: $("#livePhotoHandoffProgressMeta"),
  livePhotoHandoffProgressBar: $("#livePhotoHandoffProgressBar"),
  livePhotoHandoffProgressFill: $("#livePhotoHandoffProgressFill"),
  livePhotoHandoffProgressSteps: $("#livePhotoHandoffProgressSteps"),
  livePhotoHandoffCancel: $("#livePhotoHandoffCancelBtn"),
  onboardingTour: $("#onboardingTour"),
  onboardingFocus: $("#onboardingFocus"),
  onboardingTooltip: $("#onboardingTooltip"),
  onboardingTitle: $("#onboardingTitle"),
  onboardingBody: $("#onboardingBody"),
  onboardingProgress: $("#onboardingProgress"),
  onboardingAction: $("#onboardingActionBtn"),
  onboardingSkip: $("#onboardingSkipBtn"),
  onboardingNext: $("#onboardingNextBtn"),
  featureBadges: document.querySelectorAll("[data-feature-badge]"),
};

// 默认头像数据在 src/default-avatar.js，需在本文件之前加载。
const sampleAvatar = window.DEFAULT_AVATAR_DATA_URL;

const sampleImage =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="650" viewBox="0 0 1200 650">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#f3efe6"/>
      <stop offset="0.48" stop-color="#d9e8e0"/>
      <stop offset="1" stop-color="#efc8a2"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="650" fill="url(#g)"/>
  <rect x="95" y="95" width="1010" height="460" rx="34" fill="#ffffff" opacity=".45"/>
  <circle cx="735" cy="305" r="132" fill="#222831"/>
  <circle cx="735" cy="230" r="62" fill="#f5d8c9"/>
  <path d="M605 502c23-111 234-113 260 0" fill="#111827"/>
  <rect x="210" y="318" width="305" height="25" rx="12" fill="#243447"/>
  <circle cx="538" cy="331" r="45" fill="#111827"/>
  <path d="M190 420h370" stroke="#ffffff" stroke-width="9" opacity=".65"/>
  <path d="M190 462h330" stroke="#ffffff" stroke-width="9" opacity=".65"/>
  <text x="600" y="598" text-anchor="middle" font-size="36" fill="#ffffff" font-family="Arial, sans-serif">Image placeholder</text>
</svg>`);

const GUIDE_STATIC_IMAGE_SRC = "docs/guide-assets/guide-static-image.jpg";
const GUIDE_LIVE_POSTER_SRC = "docs/guide-assets/guide-live-poster.jpg";
const GUIDE_LIVE_VIDEO_SRC = "docs/guide-assets/guide-live-demo.mp4";

const verifiedBadgeSrc =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="112" height="112" viewBox="0 0 112 112">
  <g fill="#1d9bf0">
    <circle cx="56" cy="56" r="34"/>
    <circle cx="56" cy="25" r="18"/>
    <circle cx="78" cy="34" r="18"/>
    <circle cx="87" cy="56" r="18"/>
    <circle cx="78" cy="78" r="18"/>
    <circle cx="56" cy="87" r="18"/>
    <circle cx="34" cy="78" r="18"/>
    <circle cx="25" cy="56" r="18"/>
    <circle cx="34" cy="34" r="18"/>
  </g>
  <path d="M34 55.5 48.5 70 79 36" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="square" stroke-linejoin="miter"/>
</svg>`);

const FONT_STACKS = {
  "zh-system": '"PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif',
  "zh-song": '"Songti SC", SimSun, "Noto Serif CJK SC", serif',
  "zh-kai": '"Kaiti SC", KaiTi, STKaiti, serif',
  "zh-hei": 'STHeiti, "Heiti SC", "Microsoft YaHei", sans-serif',
  "en-system": '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  "en-serif": 'Georgia, "Times New Roman", Times, serif',
  "en-rounded": '"Arial Rounded MT Bold", "Avenir Next", Arial, sans-serif',
  "en-mono": '"SFMono-Regular", Menlo, Consolas, monospace',
};

const UI_THEMES = ["light", "dark"];

const UI_THEME_LABELS = {
  light: "白色",
  dark: "黑色",
};

const CARD_THEME_COLORS = {
  light: {
    textColor: "#202938",
    accentColor: "#17202f",
    bgColor: "#ffffff",
  },
  dark: {
    textColor: "#ffffff",
    accentColor: "#ffffff",
    bgColor: "#050505",
  },
};

const CARD_BG_PATTERNS = ["none", "grid", "lines", "dots", "gradient"];

// 背景主题只是一组初始值：选中后写回设计设置里的各个输入框，用户仍可逐项微调。
const CARD_BG_THEMES = [
  { id: "plain", label: "纯白", bgColor: "#ffffff", textColor: "#202938", accentColor: "#17202f", bgPattern: "none" },
  { id: "paper", label: "米黄纸", bgColor: "#f6efe0", textColor: "#3b3126", accentColor: "#9a5b24", bgPattern: "none" },
  { id: "grid", label: "网格纸", bgColor: "#fbfcfe", textColor: "#1f2937", accentColor: "#2563eb", bgPattern: "grid" },
  { id: "lines", label: "横线本", bgColor: "#fffdf7", textColor: "#2b2b2b", accentColor: "#c2410c", bgPattern: "lines" },
  { id: "dots", label: "点阵", bgColor: "#ffffff", textColor: "#1e293b", accentColor: "#0f766e", bgPattern: "dots" },
  { id: "mint", label: "薄荷", bgColor: "#ecf8f1", textColor: "#123c2d", accentColor: "#0f7a55", bgPattern: "none" },
  { id: "gradient", label: "柔和渐变", bgColor: "#fdf2f8", textColor: "#3b2a4a", accentColor: "#be185d", bgPattern: "gradient" },
  { id: "dark", label: "深夜", bgColor: "#050505", textColor: "#ffffff", accentColor: "#ffffff", bgPattern: "none" },
];

const defaultText = `[[image:sample]]

她说，如果你无聊的时候，不想只是刷手机，可以让 AI 做一件事：

“请你从某个领域里，选择一个研究生水平的概念。然后写一个寓言故事，用间接的方式把这个概念讲清楚。不要一开始就说答案，尽量到故事快结束的时候，才让人意识到原来讲的是这个概念。故事结束后，再解释这个概念，以及故事里的隐喻分别对应什么。”

## 你可以继续补充你的长文本

系统会根据每一页能容纳的行数自动切割，保留大标题、小标题、加粗、斜体、颜色和图片。`;

const state = {
  avatar: sampleAvatar,
  avatarCrop: null,
  images: {
    sample: {
      src: sampleImage,
      name: "sample",
    },
  },
  canvases: [],
  lastFindIndex: -1,
  uiTheme: "light",
  headerMode: "every",
  appMode: "cards",
  articleTheme: DEFAULT_ARTICLE_THEME,
  articleCodeTheme: DEFAULT_ARTICLE_CODE_THEME,
  articleMacCode: true,
  articleSize: DEFAULT_ARTICLE_SIZE,
  obsidianNotePath: null,
  currentProjectId: null,
  projects: [],
  historyFilter: "cards",
  panelLayout: {
    history: PANEL_LIMITS.history.fallback,
    editor: PANEL_LIMITS.editor.fallback,
  },
};

const textHistory = {
  stack: [],
  index: -1,
  timer: null,
  restoring: false,
  max: 80,
};

const cropper = {
  target: null,
  image: null,
  rect: null,
  aspect: null,
  display: null,
  drag: null,
};

let imageEditDrag = null;
let previewImageDrag = null;
let previewImageSelection = null;
let wechatCoverData = "";
let wechatServiceReady = false;
let wechatSyncing = false;
let feedbackFiles = [];
let feedbackPreviewUrls = [];
let feedbackReturnFocus = null;
let feedbackSending = false;
let feedbackAbortController = null;
let feedbackSubmissionAccepted = false;
let feedbackCurrentId = "";
let portableImportCandidate = null;
let portableImportOptions = [];
let portableImportSelectionId = 0;
let portableImportReturnFocus = null;
let portableImportApplying = false;
const livePhotoState = {
  file: null,
  objectUrl: "",
  sourceDuration: 0,
  sourceWidth: 0,
  sourceHeight: 0,
  duration: 5,
  speed: 1,
  aspect: "original",
  customAspect: 0.75,
  localReady: false,
  serviceMode: "none",
  generating: false,
  editingId: "",
  crop: null,
  savedCrop: null,
  cropDisplay: null,
  cropDrag: null,
  previewFrame: 0,
};
const liveMediaFiles = new Map();
const livePhotoHandoffState = {
  liveResults: [],
  staticPages: [],
  staticPackage: null,
  onlineFallback: false,
  onlineEntries: [],
  selectedJobId: "",
  selectedPageIndex: -1,
  items: [],
  isBatch: false,
  batch: null,
  batchPreparing: null,
  pendingEntries: [],
  prepared: false,
};
const livePhotoPrewarmState = {
  jobs: new Map(),
  timer: 0,
};
const exportProgressState = {
  main: { active: false, startedAt: 0, timer: 0, hideTimer: 0, current: null, total: null, value: 0 },
  handoff: { active: false, startedAt: 0, timer: 0, hideTimer: 0, current: null, total: null, value: 0 },
};
const cloudState = {
  session: null,
  user: null,
  profileAvatarUrl: "",
  loadingWorkspace: false,
  syncingProfile: false,
  profileTimer: 0,
  pendingAvatarUpload: false,
  localImportProjects: [],
  legacyProjects: [],
  legacyProjectsStatus: "idle",
  migrationReceipts: {},
  migrationBusy: false,
  initialized: false,
  loadingUserId: "",
  signingOut: false,
  switchingAccount: false,
};
const entryState = {
  mode: "pending",
  resolved: false,
  returning: false,
};
let onboardingStepIndex = 0;
let onboardingMode = "first-run";
const obsidianVault = {
  handle: null,
  fileLookup: null,
  writable: false,
  loading: false,
  importing: false,
  syncing: false,
};

function defaultFormState() {
  return {
    title: "",
    content: defaultText,
    displayName: "捏捏番茄（AI图文版）",
    handle: DEFAULT_HANDLE,
    textColor: "#202938",
    accentColor: "#2563eb",
    bgColor: "#ffffff",
    bgPattern: "none",
    fontSize: String(DEFAULT_CARD_FONT_SIZE),
    lineHeight: String(DEFAULT_CARD_LINE_HEIGHT),
    zhFont: "zh-system",
    enFont: "en-system",
    imageHeight: String(CARD_MAX_IMAGE_HEIGHT),
    headerMode: "every",
    appMode: "cards",
    articleTheme: DEFAULT_ARTICLE_THEME,
    articleCodeTheme: DEFAULT_ARTICLE_CODE_THEME,
    articleMacCode: true,
    articleSize: DEFAULT_ARTICLE_SIZE,
    obsidianNotePath: null,
    uiTheme: "light",
    avatar: sampleAvatar,
    avatarCrop: null,
    images: defaultImages(),
  };
}

function blankFormState() {
  const profile = loadStoredAuthorProfile();
  return {
    ...defaultFormState(),
    ...(profile || {}),
    title: "",
    content: "",
    images: {},
  };
}

const cardsGuideText = `# 图文卡片说明书

这是一份内置说明书，用来直接体验图文卡片、普通图片、实况图片和 Obsidian 同步。它不会被修改，也不能删除。

## 第一步：创建自己的内容

点击左上角“+”新建内容，再粘贴 Markdown 或普通文本。图文卡片适合小红书图文、X 长帖截图、知识卡片和长文拆条。

## 第二步：插入普通图片

点击工具栏的图片按钮，上传后选择裁剪比例和画面范围。

[[image:guide_static]]

上面是普通图片示例。在右侧可以拖动图片调整段落位置，也可以修改宽度、对齐和裁剪。

编辑框里的 \`[[image:图片编号]]\` 就是图片位置，把整行移动到其他段落之间即可重新排版。

## 第三步：制作实况图片

点击工具栏的视频按钮，上传 MP4、MOV 或 WebM。选择发布平台和画面比例后，拖动裁剪框决定保留区域，再插入图文。

[[image:guide_live]]

上面是可播放的内置实况演示。新建内容后请换成自己的视频；右侧下载会自动识别实况页，直接在本机浏览器里合成完整 Live Photo 发布包，原视频不会上传。本地版还可以直接打开 Finder 和 AirDrop。

混合批量下载会保持原始顺序：普通页面保留为高清 PNG，实况页面保留为完整 \`.pvt\`。在线版下载 ZIP 后，在 Finder 中把整个 \`.pvt\` AirDrop 到 iPhone。

## 第四步：连接 Obsidian

点击工具栏的 Obsidian 按钮，选择仓库根目录。之后直接粘贴 Obsidian Markdown，页面会读取 \`![[图片.png]]\` 和标准 Markdown 图片。

修改完成后点击“同步回 Obsidian”。浏览器允许写入时会保存到仓库的“写了就发”文件夹；无法直写时会下载 ZIP 导入包。

## 第五步：排版与导出

使用 H1、H2、加粗、斜体、引用、颜色和文字背景色整理重点。

选择“每页头像”或“仅首页头像”，在右侧检查自动分页，再下载单张或批量导出。

如果某一页太满，优先拆短段落，而不是一味缩小字号。空行会被保留，可以主动控制卡片节奏。

## 常用 Markdown

- \`# 标题\`：大标题
- \`## 标题\`：段落标题
- \`**文字**\`：加粗
- \`*文字*\`：斜体
- \`> 内容\`：引用块`;

function cardsGuideImages() {
  return {
    guide_static: {
      src: GUIDE_STATIC_IMAGE_SRC,
      name: "普通图片示例",
      layout: { widthPercent: 100, align: "center" },
    },
    guide_live: {
      kind: "live",
      src: GUIDE_LIVE_POSTER_SRC,
      previewVideoSrc: GUIDE_LIVE_VIDEO_SRC,
      videoKey: "guide_live",
      videoName: "guide-live-demo.mp4",
      name: "实况图片示例",
      demoOnly: true,
      layout: { widthPercent: 100, align: "center" },
      liveSettings: {
        duration: 5,
        speed: 1,
        aspect: "1.777778",
        start: 0,
        coverOffset: 0.2,
        focusX: 50,
        focusY: 50,
      },
    },
  };
}

const articleGuideText = `# 长文说明书

这是一份内置说明书，用来快速看懂长文模式。它不会被修改，也不能删除。

长文模式适合把内容整理成完整文章，而不是拆成多张图。

## 适合什么内容

- 公众号文章草稿
- Markdown 长文
- 方法论文章
- 产品介绍
- 图文内容沉淀

## 基本流程

1. 新建原稿后点击“转长文”。
2. 在左侧输入 Markdown 内容。
3. 在右侧查看长文预览。
4. 在右侧选正文主题、字号和代码主题；点「查看主题 CSS」可以改样式，改动会存成「自定义」主题。
5. 需要拆成图文时，点击“转图文”。

## 推荐结构

# 主标题

开头先讲清楚这篇文章解决什么问题。

## 第一部分

用短段落展开观点。每段尽量只讲一件事。

> 可以用引用块放关键判断、金句或提醒。

## 第二部分

中间可以插入图片，辅助说明复杂内容。

## 结尾

最后做总结，给读者一个明确动作。

## Markdown 写法

- \`#\` 一级标题
- \`##\` 二级标题
- \`###\` 三级标题
- \`**文字**\` 加粗
- \`*文字*\` 斜体
- \`> 内容\` 引用
- \`- 内容\` 列表
- \`[[image:img_xxxxx]]\` 图片

## 和图文模式互转

长文没写完也可以转图文。

图文没排完也可以转长文。

转换只改变排版方式，不会替你重写内容。`;

function builtInGuideProjects() {
  const cardsData = migrateStoredState({
    ...defaultFormState(),
    content: cardsGuideText,
    appMode: "cards",
    headerMode: "every",
    images: cardsGuideImages(),
  });
  const articleData = migrateStoredState({
    ...defaultFormState(),
    content: articleGuideText,
    appMode: "article",
    images: {},
  });
  return [
    {
      id: GUIDE_CARDS_PROJECT_ID,
      title: "图文卡片说明书",
      updatedAt: 0,
      data: cardsData,
      builtIn: true,
    },
    {
      id: GUIDE_ARTICLE_PROJECT_ID,
      title: "长文说明书",
      updatedAt: 0,
      data: articleData,
      builtIn: true,
    },
  ];
}

function isBuiltInProjectId(projectId) {
  return String(projectId || "").startsWith(BUILT_IN_PROJECT_PREFIX);
}

function isBuiltInProject(project) {
  return Boolean(project?.builtIn || isBuiltInProjectId(project?.id));
}

const GUIDE_DOWNLOAD_MESSAGE = "内置说明书仅供预览，请先点击左上角“+”新建自己的内容再下载。";

function blockBuiltInGuideDownload() {
  if (!isBuiltInProjectId(state.currentProjectId)) return false;
  els.status.textContent = GUIDE_DOWNLOAD_MESSAGE;
  return true;
}

function allHistoryProjects() {
  return [...builtInGuideProjects(), ...state.projects];
}

function findHistoryProject(projectId) {
  return allHistoryProjects().find((project) => project.id === projectId) || null;
}

function syncGuideReadOnlyMode() {
  const readOnly = isBuiltInProjectId(state.currentProjectId);
  document.body.dataset.guideReadonly = readOnly ? "true" : "false";
  els.content.readOnly = readOnly;
  els.content.setAttribute("aria-readonly", readOnly ? "true" : "false");
  els.draftTitle.readOnly = readOnly;

  document
    .querySelectorAll(
      ".mode-switch button, #convertModeBtn, #headerModeToggleBtn, #themeToggleBtn, .editor-controls button, .editor-controls input, .editor-controls select, .editor-controls summary",
    )
    .forEach((control) => {
      if (control instanceof HTMLDetailsElement) return;
      if ("disabled" in control) control.disabled = readOnly;
      control.setAttribute("aria-disabled", readOnly ? "true" : "false");
      if (readOnly) {
        control.dataset.previousTabIndex = control.getAttribute("tabindex") || "";
        control.setAttribute("tabindex", "-1");
      } else {
        const previousTabIndex = control.dataset.previousTabIndex;
        if (previousTabIndex) {
          control.setAttribute("tabindex", previousTabIndex);
        } else {
          control.removeAttribute("tabindex");
        }
        delete control.dataset.previousTabIndex;
      }
    });

  if (readOnly) {
    document.querySelectorAll(".editor-controls details[open]").forEach((details) => details.removeAttribute("open"));
    hideSelectionToolbar();
  }
  syncExportBusyState();
}

function readForm() {
  return {
    title: els.draftTitle.value.trim(),
    content: els.content.value,
    displayName: els.displayName.value.trim() || "未命名作者",
    handle: normalizeHandle(els.handle.value),
    textColor: els.textColor.value,
    accentColor: els.accentColor.value,
    bgColor: els.bgColor.value,
    bgPattern: normalizeBgPattern(els.bgPattern.value),
    fontSize: clamp(Number(els.fontSize.value) || DEFAULT_CARD_FONT_SIZE, 24, 40),
    lineHeight: clamp(Number(els.lineHeight.value) || DEFAULT_CARD_LINE_HEIGHT, 1, 2.4),
    zhFont: FONT_STACKS[els.zhFont.value] ? els.zhFont.value : "zh-system",
    enFont: FONT_STACKS[els.enFont.value] ? els.enFont.value : "en-system",
    imageHeight: clamp(Number(els.imageHeight.value) || CARD_MAX_IMAGE_HEIGHT, 220, CARD_MAX_IMAGE_HEIGHT),
    headerMode: state.headerMode === "first" ? "first" : "every",
    appMode: state.appMode === "article" ? "article" : "cards",
    articleTheme: normalizeArticleTheme(state.articleTheme),
    articleCodeTheme: normalizeArticleCodeTheme(state.articleCodeTheme),
    articleMacCode: state.articleMacCode !== false,
    articleSize: normalizeArticleSize(state.articleSize),
    obsidianNotePath: state.obsidianNotePath,
    uiTheme: state.uiTheme,
    avatar: state.avatar,
    avatarCrop: state.avatarCrop,
    images: state.images,
  };
}

function normalizeAuthorProfile(data = {}) {
  const displayName = String(data.displayName || "").trim().slice(0, 40) || "捏捏番茄（AI图文版）";
  const avatarCrop = data.avatarCrop && typeof data.avatarCrop === "object"
    ? {
        x: finiteNumber(data.avatarCrop.x, 0),
        y: finiteNumber(data.avatarCrop.y, 0),
        width: finiteNumber(data.avatarCrop.width, 0),
        height: finiteNumber(data.avatarCrop.height, 0),
      }
    : null;
  return {
    displayName,
    // 留空是合法状态：清掉之后不要再被默认值顶回来。
    handle: normalizeHandle(data.handle),
    avatar: typeof data.avatar === "string" && data.avatar ? data.avatar : sampleAvatar,
    avatarCrop,
  };
}

// 头像、昵称这类设置在任何模式下都要跨次访问保留，所以一律放 localStorage。
function authorProfileStorage() {
  return localStorage;
}

function loadStoredAuthorProfile() {
  try {
    const key = scopedStorageKey(AUTHOR_PROFILE_STORAGE_KEY);
    // 兼容改动前存在 sessionStorage 里的游客资料
    const raw = authorProfileStorage().getItem(key) || sessionStorage.getItem(key);
    return raw ? normalizeAuthorProfile(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function saveAuthorProfile(data = readForm()) {
  if (isBuiltInProjectId(state.currentProjectId)) return false;
  try {
    authorProfileStorage().setItem(scopedStorageKey(AUTHOR_PROFILE_STORAGE_KEY), JSON.stringify(normalizeAuthorProfile(data)));
    scheduleCloudProfileSync();
    return true;
  } catch {
    els.status.textContent = "头像文件过大，作者资料暂时无法写入本机缓存";
    return false;
  }
}

function applyForm(data) {
  const projectProfile = normalizeAuthorProfile(data);
  const profile = isBuiltInProjectId(state.currentProjectId)
    ? projectProfile
    : loadStoredAuthorProfile() || projectProfile;
  els.content.value = data.content ?? defaultText;
  els.draftTitle.value = typeof data.title === "string" ? data.title : "";
  updateDraftTitlePlaceholder();
  els.displayName.value = profile.displayName;
  els.handle.value = profile.handle;
  els.textColor.value = data.textColor ?? "#202938";
  els.accentColor.value = data.accentColor ?? "#2563eb";
  els.bgColor.value = data.bgColor ?? "#ffffff";
  els.bgPattern.value = normalizeBgPattern(data.bgPattern);
  els.fontSize.value = data.fontSize ?? String(DEFAULT_CARD_FONT_SIZE);
  els.lineHeight.value = data.lineHeight ?? String(DEFAULT_CARD_LINE_HEIGHT);
  els.zhFont.value = FONT_STACKS[data.zhFont] ? data.zhFont : "zh-system";
  els.enFont.value = FONT_STACKS[data.enFont] ? data.enFont : "en-system";
  const storedImageHeight = String(data.imageHeight ?? CARD_MAX_IMAGE_HEIGHT);
  els.imageHeight.value = ["380", "520"].includes(storedImageHeight)
    ? String(CARD_MAX_IMAGE_HEIGHT)
    : storedImageHeight;
  state.headerMode = data.headerMode === "first" ? "first" : "every";
  state.appMode = data.appMode === "article" ? "article" : "cards";
  state.articleTheme = normalizeArticleTheme(data.articleTheme);
  state.articleCodeTheme = normalizeArticleCodeTheme(data.articleCodeTheme);
  state.articleMacCode = data.articleMacCode !== false;
  state.articleSize = normalizeArticleSize(data.articleSize);
  state.obsidianNotePath = normalizeObsidianNotePath(data.obsidianNotePath);
  updateAppMode();
  updateHeaderModeButton();
  updateArticleControls();
  setUiTheme(data.uiTheme || "light", false, false);
  state.avatar = profile.avatar;
  state.avatarCrop = profile.avatarCrop;
  state.images = normalizeImagesForContent(data.content, data.images);
  updateAvatarPreview();
  document.documentElement.style.setProperty("--brush-color", els.inlineColor.value);
  document.documentElement.style.setProperty("--text-bg-brush-color", els.inlineBgColor.value);
  updateImageList();
}

function setUiTheme(theme, announce = false, syncCard = false) {
  const normalizedTheme = theme === "ink" ? "dark" : theme === "paper" ? "light" : theme;
  const nextTheme = UI_THEMES.includes(normalizedTheme) ? normalizedTheme : "light";
  state.uiTheme = nextTheme;
  document.documentElement.dataset.uiTheme = nextTheme;
  if (syncCard) syncCardColorsToTheme(nextTheme);
  if (els.themeToggle) {
    const label = UI_THEME_LABELS[nextTheme];
    els.themeToggle.title = `切换黑白主题：当前 ${label}`;
    els.themeToggle.setAttribute("aria-label", `切换黑白主题，当前 ${label}`);
  }
  if (announce) {
    els.status.textContent = `已切换为${UI_THEME_LABELS[nextTheme]}主题`;
  }
}

function currentBgThemeId() {
  const current = {
    bgColor: els.bgColor.value.toLowerCase(),
    textColor: els.textColor.value.toLowerCase(),
    accentColor: els.accentColor.value.toLowerCase(),
    bgPattern: normalizeBgPattern(els.bgPattern.value),
  };
  return CARD_BG_THEMES.find((theme) => (
    theme.bgColor === current.bgColor
    && theme.textColor === current.textColor
    && theme.accentColor === current.accentColor
    && theme.bgPattern === current.bgPattern
  ))?.id || "";
}

function buildBgThemeGrid() {
  if (!els.bgThemeGrid) return;
  const activeId = currentBgThemeId();
  els.bgThemeGrid.replaceChildren(...CARD_BG_THEMES.map((theme) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "bg-theme-option";
    button.dataset.bgTheme = theme.id;
    button.setAttribute("aria-pressed", theme.id === activeId ? "true" : "false");
    const swatch = document.createElement("span");
    swatch.className = `bg-theme-swatch is-${theme.bgPattern}`;
    swatch.style.setProperty("--swatch-bg", theme.bgColor);
    swatch.style.setProperty("--swatch-bg-2", gradientPartnerColor(theme.bgColor));
    swatch.style.setProperty("--swatch-ink", rgbaFromHex(theme.textColor, 0.18));
    swatch.style.color = theme.textColor;
    swatch.textContent = "Aa";
    const accent = document.createElement("i");
    accent.style.background = theme.accentColor;
    swatch.append(accent);
    const label = document.createElement("span");
    label.className = "bg-theme-label";
    label.textContent = theme.label;
    button.append(swatch, label);
    return button;
  }));
}

function applyBgTheme(themeId) {
  const theme = CARD_BG_THEMES.find((item) => item.id === themeId);
  if (!theme || isBuiltInProjectId(state.currentProjectId)) return;
  els.bgColor.value = theme.bgColor;
  els.textColor.value = theme.textColor;
  els.accentColor.value = theme.accentColor;
  els.bgPattern.value = theme.bgPattern;
  buildBgThemeGrid();
  requestRender();
  els.status.textContent = `已切换背景主题：${theme.label}`;
}

function syncCardColorsToTheme(theme) {
  const colors = CARD_THEME_COLORS[theme] || CARD_THEME_COLORS.light;
  els.textColor.value = colors.textColor;
  els.accentColor.value = colors.accentColor;
  els.bgColor.value = colors.bgColor;
}

async function toggleUiTheme() {
  const index = UI_THEMES.indexOf(state.uiTheme);
  const nextTheme = UI_THEMES[(index + 1) % UI_THEMES.length];
  setUiTheme(nextTheme, false, true);
  await render();
  els.status.textContent = `已切换为${UI_THEME_LABELS[nextTheme]}主题`;
}

function updateHeaderModeButton() {
  if (!els.headerModeToggle) return;
  const firstOnly = state.headerMode === "first";
  els.headerModeToggle.classList.toggle("active", firstOnly);
  els.headerModeToggle.innerHTML = `<i data-lucide="${firstOnly ? "user-round-check" : "user-round"}"></i>${firstOnly ? "仅首页头像" : "每页头像"}`;
  els.headerModeToggle.title = firstOnly ? "当前仅首页显示头像昵称，点击改为每页显示" : "当前每页显示头像昵称，点击改为仅首页显示";
  els.headerModeToggle.setAttribute("aria-label", els.headerModeToggle.title);
  if (window.lucide) window.lucide.createIcons();
}

async function toggleHeaderMode() {
  state.headerMode = state.headerMode === "first" ? "every" : "first";
  updateHeaderModeButton();
  await render();
  els.status.textContent = state.headerMode === "first" ? "仅首页显示个人信息" : "每张图片都显示个人信息";
}

function updateAppMode() {
  document.body.dataset.appMode = state.appMode;
  els.modeButtons.forEach((button) => {
    const active = button.dataset.appMode === state.appMode;
    button.classList.toggle("active", active);
  });
  const targetMode = state.appMode === "article" ? "cards" : "article";
  const targetLabel = targetMode === "article" ? "转长文" : "转图文";
  els.convertMode.dataset.targetMode = targetMode;
  els.convertMode.setAttribute("aria-label", targetLabel);
  els.convertMode.setAttribute("title", targetMode === "article" ? "将当前内容转为长文" : "将当前内容自动分页为图文卡片");
  els.convertMode.querySelector("span").textContent = targetLabel;
  els.articleSettings.hidden = state.appMode !== "article";
  els.downloadZip.hidden = state.appMode === "article";
  els.downloadArticle.hidden = state.appMode !== "article";
  els.copyWechat.hidden = state.appMode !== "article";
  els.copyFeishu.hidden = state.appMode !== "article";
  // 草稿箱同步整体还不完善，先全站下线；功能做好后把这里改回按 appMode 判断即可。
  els.syncWechat.hidden = true;
  els.headerModeToggle.hidden = state.appMode === "article";
}

async function setAppMode(mode) {
  const nextMode = mode === "article" ? "article" : "cards";
  if (state.appMode === nextMode) return false;
  state.appMode = nextMode;
  updateAppMode();
  await render();
  return moveFolderDraftForCurrentType();
}

/** 转图文 / 转长文后，已关联 drafts/ 的稿件把草稿文件夹移到对应类型下。有提示时返回 true。 */
async function moveFolderDraftForCurrentType() {
  const project = state.projects.find((item) => item.id === state.currentProjectId);
  const result = await moveFolderDraftToProjectType(project);
  if (!result) return false;
  els.status.textContent = result.error
    ? `草稿文件夹未移动：${result.error}`
    : `已把 drafts/${result.from} 移到 drafts/${result.file}`;
  return true;
}

async function convertCurrentMode() {
  const nextMode = state.appMode === "article" ? "cards" : "article";
  const moved = await setAppMode(nextMode);
  showCurrentProjectInHistory();
  if (moved) return;
  els.status.textContent = nextMode === "article" ? "已转为长文" : "已转为图文卡片，并自动分页排版";
}

/** 左侧列表按类型筛选时，跟着切到当前稿件的类型，并把选中的那篇滚到可见处。 */
function showCurrentProjectInHistory() {
  if (state.historyFilter !== "all") state.historyFilter = state.appMode;
  updateProjectHistory();
  els.projectHistory?.querySelector(".history-item.active")?.scrollIntoView({ block: "nearest" });
}

/** 顶部“图文卡片 / 长文”：打开该类型最近改过的原稿，没有就打开对应说明书；转换类型交给“转图文 / 转长文”。 */
async function openLatestProjectOfType(mode) {
  const type = mode === "article" ? "article" : "cards";
  if (state.appMode === type) return;
  const latest = state.projects
    .filter((project) => projectType(project) === type)
    .reduce((best, project) => (!best || (project.updatedAt || 0) > (best.updatedAt || 0) ? project : best), null);
  await openProject(latest?.id || (type === "article" ? GUIDE_ARTICLE_PROJECT_ID : GUIDE_CARDS_PROJECT_ID));
  showCurrentProjectInHistory();
}

function updateArticleControls() {
  const themeId = resolveArticleTheme(state.articleTheme).id;
  const codeThemeId = resolveArticleCodeTheme(state.articleCodeTheme).id;
  els.articleThemeList.querySelectorAll("[data-article-theme]").forEach((button) => {
    button.classList.toggle("active", button.dataset.articleTheme === themeId);
  });
  els.articleCodeThemeList.querySelectorAll("[data-article-code-theme]").forEach((button) => {
    button.classList.toggle("active", button.dataset.articleCodeTheme === codeThemeId);
  });
  els.articleMacCode.checked = state.articleMacCode !== false;
  els.articleSizeList.querySelectorAll("[data-article-size]").forEach((button) => {
    button.classList.toggle("active", button.dataset.articleSize === state.articleSize);
  });
  syncArticleCssEditor();
}

async function setArticleOption(type, value) {
  if (type === "theme") state.articleTheme = normalizeArticleTheme(value);
  if (type === "codeTheme") state.articleCodeTheme = normalizeArticleCodeTheme(value);
  if (type === "macCode") state.articleMacCode = Boolean(value);
  if (type === "size") state.articleSize = normalizeArticleSize(value);
  updateArticleControls();
  // 和 markdown-nice 一样：切到自定义主题时自动打开 CSS 编辑器
  if (type === "theme" && state.articleTheme === ARTICLE_CUSTOM_THEME && els.articleCssPanel.hidden) {
    setArticleCssEditorOpen(true);
  }
  await render();
}

function normalizeHandle(value) {
  // 不再强制补「@」，也不给默认值：这一栏留空即可，由用户自由填写。
  return (value || "").trim();
}

/** 浏览器自带 WebCodecs 就能本地合成实况，不用云端也不用本机中继。 */
function livePhotoBrowserRenderSupported() {
  return Boolean(window.WriteThenPublishBrowserLivePhoto?.supported());
}

/** 本机版跑在 localhost / 127.0.0.1 上，只有它才有本机中继可用。 */
function isLocalHostSite() {
  return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(window.location.hostname)
    || window.location.protocol === "file:";
}

// 主题 id 只校验格式：本机才有的 markdown-nice 主题在线上找不到，渲染时由 resolveArticleTheme 回落到默认主题，
// 草稿里记下的选择不改，回到本机打开时仍是原来的主题。
function normalizeArticleTheme(value) {
  return /^[\w-]{1,64}$/.test(String(value || "")) ? String(value) : DEFAULT_ARTICLE_THEME;
}

function normalizeArticleCodeTheme(value) {
  return /^[\w-]{1,64}$/.test(String(value || "")) ? String(value) : DEFAULT_ARTICLE_CODE_THEME;
}

function normalizeArticleSize(value) {
  return Object.hasOwn(ARTICLE_SIZE_SCALES, value) ? value : DEFAULT_ARTICLE_SIZE;
}

// ---------- 长文主题：照 markdown-nice 的做法，一个主题就是一段作用于 #nice 的 CSS ----------
// 内置主题在 src/article-themes.js；本机另有 markdown-nice 主题包（GPL-3.0，由 scripts/import-mdnice-themes.mjs
// 生成，线上不加载），id 加 mdnice- 前缀，渲染时在主题下面垫一层它的 basic 样式，和 markdown-nice 一致。
const CODEMIRROR_CDN = "https://cdn.jsdelivr.net/npm/codemirror@5.65.21";
let articleThemeLibraryCache = null;
let articleCustomTheme = null;
let scopedArticleCssCache = { source: null, scale: 1, css: "" };
let articleCssEditor = null;
let articleCssEditorLoading = null;
let articleCssForkPending = false;

function articleThemeLibrary() {
  if (articleThemeLibraryCache) return articleThemeLibraryCache;
  const own = window.WriteThenPublishArticleThemes || { markdown: [], code: [] };
  const mdnice = window.WriteThenPublishMdniceThemes;
  const prefixed = (themes = [], extra = {}) => themes.map((theme) => ({ ...theme, id: `mdnice-${theme.id}`, ...extra }));
  articleThemeLibraryCache = {
    markdown: [...own.markdown, ...prefixed(mdnice?.markdown, { basic: true })],
    code: [...own.code, ...prefixed(mdnice?.code)],
    basic: mdnice?.basic || "",
    customTemplate: mdnice?.customTemplate || "",
  };
  return articleThemeLibraryCache;
}

/** 自定义主题存在本机（和 markdown-nice 一样不随草稿走）；basic 表示是否垫 markdown-nice 的基础样式。 */
function articleCustomThemeValue() {
  if (articleCustomTheme) return articleCustomTheme;
  try {
    const stored = JSON.parse(localStorage.getItem(ARTICLE_CUSTOM_THEME_STORAGE_KEY) || "null");
    if (typeof stored?.css === "string") articleCustomTheme = { css: stored.css, basic: Boolean(stored.basic) };
  } catch {}
  if (!articleCustomTheme) {
    const library = articleThemeLibrary();
    articleCustomTheme = library.customTemplate
      ? { css: library.customTemplate, basic: true }
      : { css: `/*自定义样式，实时生效*/\n\n${resolveArticleTheme(DEFAULT_ARTICLE_THEME).css}`, basic: false };
  }
  return articleCustomTheme;
}

function writeArticleCustomTheme() {
  try {
    localStorage.setItem(ARTICLE_CUSTOM_THEME_STORAGE_KEY, JSON.stringify(articleCustomThemeValue()));
    els.articleCssStatus.textContent = "已保存到本机";
  } catch {
    els.articleCssStatus.textContent = "保存失败：浏览器存储已满";
  }
}

const saveArticleCustomThemeSoon = debounce(writeArticleCustomTheme, 400);

function resolveArticleTheme(id) {
  if (id === ARTICLE_CUSTOM_THEME) return { id, name: "自定义", ...articleCustomThemeValue() };
  const { markdown } = articleThemeLibrary();
  return markdown.find((theme) => theme.id === id)
    || markdown.find((theme) => theme.id === DEFAULT_ARTICLE_THEME)
    || { id: DEFAULT_ARTICLE_THEME, name: "默认", css: "" };
}

function resolveArticleCodeTheme(id) {
  const { code } = articleThemeLibrary();
  return code.find((theme) => theme.id === id)
    || code.find((theme) => theme.id === DEFAULT_ARTICLE_CODE_THEME)
    || { id: DEFAULT_ARTICLE_CODE_THEME, name: "默认", css: "" };
}

function splitSelectorList(selector) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const char of selector) {
    if (char === "(" || char === "[") depth += 1;
    if (char === ")" || char === "]") depth -= 1;
    if (char === "," && !depth) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current.trim());
  return parts.filter(Boolean);
}

// #nice 换成 .article-preview；代码主题里 .hljs 这类不带 #nice 的选择器补上 .article-preview 前缀，不影响页面其他地方。
function scopeArticleSelector(selector) {
  return splitSelectorList(selector)
    .map((part) => (/#nice(?![\w-])/.test(part) ? part.replace(/#nice(?![\w-])/g, ".article-preview") : `.article-preview ${part}`))
    .join(", ");
}

// 主题里写死的字号和行高（px、rem、var() 等）乘上比例；em、%、无单位的跟着父元素走，不用改。
function scaleArticleLength(value, scale) {
  if (!value || !/\d|var\(/.test(value) || !/px|rem|pt|var\(/i.test(value)) return value;
  return `calc(${value} * ${scale})`;
}

function scaleArticleRuleSizes(style, scale) {
  ["font-size", "line-height"].forEach((property) => {
    const value = style.getPropertyValue(property);
    const scaled = scaleArticleLength(value, scale);
    if (scaled !== value) style.setProperty(property, scaled, style.getPropertyPriority(property));
  });
}

function scopeArticleCss(css, scale = 1) {
  if (scopedArticleCssCache.source === css && scopedArticleCssCache.scale === scale) return scopedArticleCssCache.css;
  let scoped;
  try {
    // 交给浏览器解析，@media 里的规则也能改到；写错的声明会被丢掉，不影响其余样式。
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    const visit = (rules) => Array.from(rules, (rule) => {
      if (rule instanceof CSSStyleRule) {
        rule.selectorText = scopeArticleSelector(rule.selectorText);
        if (scale !== 1) scaleArticleRuleSizes(rule.style, scale);
      } else if (rule.cssRules) visit(rule.cssRules);
      return rule.cssText;
    });
    scoped = visit(sheet.cssRules).join("\n");
  } catch {
    scoped = css.replace(/#nice(?![\w-])/g, ".article-preview");
  }
  scopedArticleCssCache = { source: css, scale, css: scoped };
  return scoped;
}

function articleThemeCss(settings) {
  const theme = resolveArticleTheme(settings.articleTheme);
  const code = resolveArticleCodeTheme(settings.articleCodeTheme);
  const basic = theme.basic ? articleThemeLibrary().basic : "";
  // 主题没写正文字号时按 16px 算，这样字号档位对所有主题都起作用
  const base = "#nice { font-size: 16px; }";
  const scale = ARTICLE_SIZE_SCALES[normalizeArticleSize(settings.articleSize)];
  return scopeArticleCss([base, basic, theme.css, code.css].join("\n"), scale);
}

function applyArticleThemeStyle(settings) {
  const css = articleThemeCss(settings);
  if (els.articleThemeStyle.textContent !== css) els.articleThemeStyle.textContent = css;
}

function renderArticleThemeOptions() {
  const { markdown, code } = articleThemeLibrary();
  const option = (attribute, theme) =>
    `<button type="button" class="article-option" ${attribute}="${escapeAttribute(theme.id)}"` +
    ` title="${escapeAttribute(theme.author ? `${theme.name} · ${theme.author}` : theme.name)}">` +
    `<span>${escapeHtml(theme.name)}</span>${theme.author ? `<small>${escapeHtml(theme.author)}</small>` : ""}</button>`;
  els.articleThemeList.innerHTML = [...markdown, { id: ARTICLE_CUSTOM_THEME, name: "自定义", author: "主题 CSS" }]
    .map((theme) => option("data-article-theme", theme))
    .join("");
  els.articleCodeThemeList.innerHTML = code.map((theme) => option("data-article-code-theme", theme)).join("");
}

// ---------- 主题 CSS 编辑器：CodeMirror 5（sublime 键位、CSS 补全、自动补括号），用到时才从 CDN 加载 ----------
function loadArticleEditorAsset(url) {
  return new Promise((resolve, reject) => {
    const element = url.endsWith(".css")
      ? Object.assign(document.createElement("link"), { rel: "stylesheet", href: url })
      : Object.assign(document.createElement("script"), { src: url, async: false });
    element.onload = resolve;
    element.onerror = () => reject(new Error(`加载失败：${url}`));
    document.head.append(element);
  });
}

function createArticleCssEditor() {
  articleCssEditorLoading ||= (async () => {
    try {
      if (!window.CodeMirror) {
        await Promise.all([
          loadArticleEditorAsset(`${CODEMIRROR_CDN}/lib/codemirror.min.css`),
          loadArticleEditorAsset(`${CODEMIRROR_CDN}/addon/hint/show-hint.min.css`),
          loadArticleEditorAsset(`${CODEMIRROR_CDN}/lib/codemirror.min.js`),
        ]);
        await Promise.all(
          ["mode/css/css", "keymap/sublime", "addon/edit/closebrackets", "addon/hint/show-hint", "addon/hint/css-hint"]
            .map((path) => loadArticleEditorAsset(`${CODEMIRROR_CDN}/${path}.min.js`)),
        );
      }
      return codeMirrorArticleCssEditor();
    } catch (error) {
      console.warn("CodeMirror 加载失败，改用纯文本框", error);
      return textareaArticleCssEditor();
    }
  })();
  return articleCssEditorLoading;
}

function codeMirrorArticleCssEditor() {
  const editor = window.CodeMirror(els.articleCssEditor, {
    theme: "style-mirror",
    keyMap: "sublime",
    mode: "css",
    lineWrapping: true,
    lineNumbers: false,
    autoCloseBrackets: true,
    tabSize: 2,
  });
  editor.on("beforeChange", (_, change) => {
    if (change.origin === "setValue" || articleCssEditable()) return;
    change.cancel();
    requestArticleCssFork();
  });
  editor.on("changes", (_, changes) => {
    if (changes.some((change) => change.origin !== "setValue")) handleArticleCssInput(editor.getValue());
  });
  editor.on("keyup", (_, event) => {
    if (/^[a-z-]$/i.test(event.key) && !editor.state.completionActive) editor.showHint({ completeSingle: false });
  });
  return {
    setValue(value) {
      if (editor.getValue() === value) return;
      editor.setValue(value);
      // 换主题后不能撤销回上一个主题的 CSS
      editor.clearHistory();
    },
    refresh: () => editor.refresh(),
  };
}

function textareaArticleCssEditor() {
  const textarea = document.createElement("textarea");
  textarea.spellcheck = false;
  textarea.setAttribute("aria-label", "主题 CSS");
  textarea.addEventListener("beforeinput", (event) => {
    if (articleCssEditable()) return;
    event.preventDefault();
    requestArticleCssFork();
  });
  textarea.addEventListener("input", () => handleArticleCssInput(textarea.value));
  els.articleCssEditor.append(textarea);
  return {
    setValue(value) {
      if (textarea.value !== value) textarea.value = value;
    },
    refresh() {},
  };
}

function articleCssEditable() {
  return state.articleTheme === ARTICLE_CUSTOM_THEME;
}

// 和 markdown-nice 一样：内置主题不直接改，确认后把它复制成自定义主题再编辑。
function requestArticleCssFork() {
  if (articleCssForkPending) return;
  articleCssForkPending = true;
  // 等编辑器这次输入处理完再弹窗
  window.setTimeout(async () => {
    const theme = resolveArticleTheme(state.articleTheme);
    const confirmed = window.confirm(`要基于「${theme.name}」修改吗？\n确定后会把它的样式复制成「自定义」主题，原来的自定义样式会被覆盖。`);
    articleCssForkPending = false;
    if (!confirmed) return;
    articleCustomTheme = { css: `/*自定义样式，实时生效*/\n\n${theme.css}`, basic: Boolean(theme.basic) };
    writeArticleCustomTheme();
    await setArticleOption("theme", ARTICLE_CUSTOM_THEME);
  }, 0);
}

function handleArticleCssInput(css) {
  if (!articleCssEditable()) return;
  articleCustomTheme = { ...articleCustomThemeValue(), css };
  els.articleCssStatus.textContent = "保存中…";
  saveArticleCustomThemeSoon();
  // 只换样式，不重新渲染正文
  applyArticleThemeStyle(state);
}

async function setArticleCssEditorOpen(open) {
  els.articleCssPanel.hidden = !open;
  els.articleSettings.classList.toggle("editing", open);
  els.articleCssToggle.setAttribute("aria-expanded", String(open));
  if (!open) return;
  if (!articleCssEditor) els.articleCssStatus.textContent = "加载编辑器…";
  articleCssEditor = await createArticleCssEditor();
  syncArticleCssEditor();
  articleCssEditor.refresh();
}

/** 编辑器里显示当前主题的原始 CSS（#nice 写法）。 */
function syncArticleCssEditor() {
  if (!articleCssEditor || els.articleCssPanel.hidden) return;
  const theme = resolveArticleTheme(state.articleTheme);
  const changed = articleCssEditor.theme !== theme.id;
  articleCssEditor.theme = theme.id;
  articleCssEditor.setValue(theme.css);
  if (changed) els.articleCssStatus.textContent = theme.id === ARTICLE_CUSTOM_THEME ? "修改自动保存" : theme.name;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function loadPanelLayout() {
  try {
    const stored = JSON.parse(localStorage.getItem(PANEL_LAYOUT_STORAGE_KEY) || "{}");
    state.panelLayout.history = clamp(Number(stored.history) || PANEL_LIMITS.history.fallback, PANEL_LIMITS.history.min, PANEL_LIMITS.history.max);
    state.panelLayout.editor = clamp(Number(stored.editor) || PANEL_LIMITS.editor.fallback, PANEL_LIMITS.editor.min, PANEL_LIMITS.editor.max);
  } catch {
    state.panelLayout.history = PANEL_LIMITS.history.fallback;
    state.panelLayout.editor = PANEL_LIMITS.editor.fallback;
  }
}

function savePanelLayout() {
  localStorage.setItem(PANEL_LAYOUT_STORAGE_KEY, JSON.stringify(state.panelLayout));
}

function applyPanelLayout() {
  els.workspace?.style.setProperty("--history-width", `${Math.round(state.panelLayout.history)}px`);
  els.workspace?.style.setProperty("--editor-width", `${Math.round(state.panelLayout.editor)}px`);
}

function startPanelResize(event) {
  const target = event.currentTarget.dataset.panelResize;
  if (!["history", "editor"].includes(target)) return;
  if (window.matchMedia("(max-width: 680px)").matches) return;

  event.preventDefault();
  if (target === "history" && !els.historySidebar?.classList.contains("open")) {
    setHistoryOpen(true);
  }

  const startX = event.clientX;
  const startEditor = state.panelLayout.editor;
  const workspaceRect = els.workspace.getBoundingClientRect();
  const resizeHandle = event.currentTarget;
  resizeHandle.classList.add("active");
  document.body.classList.add("resizing-panels");
  resizeHandle.setPointerCapture?.(event.pointerId);

  const move = (moveEvent) => {
    if (target === "history") {
      const nextHistory = moveEvent.clientX - workspaceRect.left;
      state.panelLayout.history = clamp(nextHistory, PANEL_LIMITS.history.min, PANEL_LIMITS.history.max);
    } else {
      const nextEditor = startEditor + moveEvent.clientX - startX;
      state.panelLayout.editor = clamp(nextEditor, PANEL_LIMITS.editor.min, PANEL_LIMITS.editor.max);
    }
    applyPanelLayout();
  };

  const stop = (upEvent) => {
    resizeHandle.classList.remove("active");
    document.body.classList.remove("resizing-panels");
    resizeHandle.releasePointerCapture?.(upEvent.pointerId);
    savePanelLayout();
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);
  };

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", stop);
}

function debounce(fn, wait = 140) {
  let id;
  return (...args) => {
    window.clearTimeout(id);
    id = window.setTimeout(() => fn(...args), wait);
  };
}

function saveState() {
  try {
    const data = readForm();
    if (isBuiltInProjectId(state.currentProjectId)) {
      updateProjectHistory();
      return;
    }
    saveAuthorProfile(data);

    const now = Date.now();
    let current = state.projects.find((project) => project.id === state.currentProjectId);
    if (!current) {
      current = createProject(data);
      state.currentProjectId = current.id;
      state.projects.unshift(current);
    }
    current.data = data;
    current.title = projectTitleFromData(data);
    current.updatedAt = now;
    state.projects = [
      current,
      ...state.projects.filter((project) => project.id !== current.id),
    ].slice(0, MAX_PROJECTS);
    storageForScope().setItem(
      scopedStorageKey(STORAGE_KEY),
      JSON.stringify(withExternalizedImages(data, current.id)),
    );
    saveProjectStore();
    updateProjectHistory();
    scheduleFolderDraftWriteBack(current.id);
  } catch {
    els.status.textContent = "本次内容较大，浏览器未写入本地缓存";
  }
}

function loadState() {
  const store = loadProjectStore();
  state.projects = store.projects;
  state.currentProjectId = store.activeId || store.projects[0]?.id || GUIDE_CARDS_PROJECT_ID;
  const data = findHistoryProject(state.currentProjectId)?.data || findHistoryProject(GUIDE_CARDS_PROJECT_ID)?.data || defaultFormState();
  if (!isBuiltInProjectId(state.currentProjectId) && !loadStoredAuthorProfile()) {
    saveAuthorProfile(data);
  }
  return data;
}

function cloudApi() {
  return window.WriteThenPublishCloud || null;
}

function cloudIsReady() {
  return Boolean(cloudApi()?.configured && cloudState.user)
    && (!ACCOUNT_MAINTENANCE || isMigrationTestUser(cloudState.user));
}

function accountScope(userId) {
  return `user_${String(userId || "").replace(/[^a-z0-9_-]/gi, "")}`;
}

function loadProjectStoreForScope(scope) {
  const previousScope = activeStorageScope;
  activeStorageScope = scope;
  const store = loadProjectStore();
  activeStorageScope = previousScope;
  return store;
}

// 云端超出免费额度时 Supabase 直接返回一段英文的 402 说明，用户看不懂也无从下手。
// 所有账号相关提示都经过 setAccountNotice，在这里统一换成中文并给出游客入口。
const CLOUD_RESTRICTED_NOTICE = "账号服务暂时不可用。你仍可使用游客模式排版；关闭前请保存 ZIP 原稿，之后可从左上角重新导入。";

function isCloudRestrictedMessage(message) {
  const text = String(message || "");
  return text === CLOUD_RESTRICTED_NOTICE || /service for this project is restricted|exceed_\w*quota/i.test(text);
}

function setAccountNotice(message = "", tone = "") {
  if (!els.accountConfigNotice) return;
  const restricted = isCloudRestrictedMessage(message);
  const text = restricted ? CLOUD_RESTRICTED_NOTICE : message;
  els.accountConfigNotice.hidden = !text;
  els.accountConfigNotice.textContent = text;
  // 维护中不是用户的错，用中性样式，不标红
  els.accountConfigNotice.className = `account-notice${!restricted && tone ? ` ${tone}` : ""}`;
  if (els.accountGuestFallback) els.accountGuestFallback.hidden = !restricted;
}

let accountAuthMode = "signin";
let accountAuthAddMode = false;
let pendingConfirmationEmail = "";

function accountSessionSnapshot(session) {
  const user = session?.user;
  const accessToken = String(session?.access_token || "").trim();
  const refreshToken = String(session?.refresh_token || "").trim();
  if (!user?.id || !accessToken || !refreshToken) return null;
  const metadata = user.user_metadata || {};
  return {
    userId: String(user.id),
    email: String(user.email || ""),
    displayName: String(metadata.full_name || metadata.name || metadata.user_name || ""),
    avatarUrl: String(metadata.avatar_url || metadata.picture || ""),
    accessToken,
    refreshToken,
    expiresAt: Number(session.expires_at || 0),
    expiresIn: Number(session.expires_in || 0),
    tokenType: String(session.token_type || "bearer"),
    lastUsedAt: Date.now(),
  };
}

function readStoredAccountSessions() {
  try {
    const raw = JSON.parse(localStorage.getItem(ACCOUNT_SESSIONS_STORAGE_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((item) => item && item.userId && item.accessToken && item.refreshToken)
      .map((item) => ({
        userId: String(item.userId),
        email: String(item.email || ""),
        displayName: String(item.displayName || ""),
        avatarUrl: String(item.avatarUrl || ""),
        accessToken: String(item.accessToken),
        refreshToken: String(item.refreshToken),
        expiresAt: Number(item.expiresAt || 0),
        expiresIn: Number(item.expiresIn || 0),
        tokenType: String(item.tokenType || "bearer"),
        lastUsedAt: Number(item.lastUsedAt || 0),
      }))
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt);
  } catch {
    return [];
  }
}

function writeStoredAccountSessions(sessions) {
  try {
    localStorage.setItem(ACCOUNT_SESSIONS_STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_STORED_ACCOUNT_SESSIONS)));
  } catch {
    // 浏览器禁用本地存储时不影响当前账号继续使用，只关闭多账号记忆。
  }
}

function rememberAccountSession(session) {
  const snapshot = accountSessionSnapshot(session);
  if (!snapshot) return null;
  const sessions = readStoredAccountSessions().filter((item) => item.userId !== snapshot.userId);
  writeStoredAccountSessions([snapshot, ...sessions]);
  return snapshot;
}

function removeStoredAccountSession(userId) {
  if (!userId) return;
  writeStoredAccountSessions(readStoredAccountSessions().filter((item) => item.userId !== String(userId)));
}

function availableAccountSessions() {
  const sessions = readStoredAccountSessions();
  const current = accountSessionSnapshot(cloudState.session);
  if (current && !sessions.some((item) => item.userId === current.userId)) sessions.unshift(current);
  return sessions;
}

function accountSessionName(snapshot) {
  return snapshot.displayName || snapshot.email?.split("@")[0] || "已登录账号";
}

function accountSessionInitial(snapshot) {
  const value = accountSessionName(snapshot).trim();
  return Array.from(value).slice(0, 2).join("").toUpperCase() || "云";
}

function renderAccountSessionList(container) {
  if (!container) return;
  container.replaceChildren();
  const currentUserId = cloudState.user?.id || "";
  availableAccountSessions().forEach((snapshot) => {
    const isCurrent = snapshot.userId === currentUserId;
    const option = document.createElement("button");
    option.type = "button";
    option.className = `account-session-option${isCurrent ? " is-active" : ""}`;
    option.disabled = isCurrent;
    option.setAttribute("aria-label", isCurrent ? `${accountSessionName(snapshot)}，当前账号` : `切换到 ${accountSessionName(snapshot)}`);
    if (isCurrent) option.setAttribute("aria-current", "true");

    const avatar = document.createElement("span");
    avatar.className = "account-session-avatar";
    if (snapshot.avatarUrl) {
      const image = document.createElement("img");
      image.src = snapshot.avatarUrl;
      image.alt = "";
      image.addEventListener("error", () => {
        image.remove();
        avatar.textContent = accountSessionInitial(snapshot);
      }, { once: true });
      avatar.append(image);
    } else {
      avatar.textContent = accountSessionInitial(snapshot);
    }

    const copy = document.createElement("span");
    copy.className = "account-session-copy";
    const name = document.createElement("strong");
    name.textContent = accountSessionName(snapshot);
    const email = document.createElement("span");
    email.textContent = snapshot.email || "本机已保存的账号";
    copy.append(name, email);

    const state = document.createElement("span");
    state.className = "account-session-state";
    state.textContent = isCurrent ? "当前使用" : "切换";
    option.append(avatar, copy, state);
    if (!isCurrent) option.addEventListener("click", () => void switchToStoredAccount(snapshot.userId));
    container.append(option);
  });
}

function setPendingConfirmation(email = "") {
  pendingConfirmationEmail = String(email || "").trim();
}

function markGoogleOAuthPending() {
  try {
    sessionStorage.setItem(GOOGLE_OAUTH_PENDING_SESSION_KEY, "1");
  } catch {
    // 关闭存储时仍可照常跳转；仅少了返回后恢复提示这一层保护。
  }
}

function takeGoogleOAuthPending() {
  try {
    const pending = sessionStorage.getItem(GOOGLE_OAUTH_PENDING_SESSION_KEY) === "1";
    sessionStorage.removeItem(GOOGLE_OAUTH_PENDING_SESSION_KEY);
    return pending;
  } catch {
    return false;
  }
}

function markAccountAddPending() {
  if (!accountAuthAddMode) return;
  try {
    sessionStorage.setItem(ACCOUNT_ADD_PENDING_SESSION_KEY, "1");
  } catch {
    // OAuth 回跳仍可完成，只是回跳后不显示“已添加账号”的专门提示。
  }
}

function takeAccountAddPending() {
  try {
    const pending = sessionStorage.getItem(ACCOUNT_ADD_PENDING_SESSION_KEY) === "1";
    sessionStorage.removeItem(ACCOUNT_ADD_PENDING_SESSION_KEY);
    return pending;
  } catch {
    return false;
  }
}

function clearAccountAddPending() {
  try {
    sessionStorage.removeItem(ACCOUNT_ADD_PENDING_SESSION_KEY);
  } catch {
    // ignore
  }
}

function restoreCancelledGoogleOAuth() {
  const pending = takeGoogleOAuthPending();
  if (LOCAL_DEPLOYMENT_MODE || cloudState.user || !pending) return false;
  clearAccountAddPending();
  setAccountBusy(false);
  if (!els.accountModal?.classList.contains("hidden")) {
    setAccountAuthMode("signin", { keepNotice: true });
    setAccountNotice(GOOGLE_OAUTH_CANCELLED_MESSAGE);
  }
  return true;
}

function setAccountPasswordVisible(visible) {
  if (!els.accountPassword || !els.accountPasswordToggle) return;
  els.accountPassword.type = visible ? "text" : "password";
  els.accountPasswordToggle.title = visible ? "隐藏密码" : "显示密码";
  els.accountPasswordToggle.setAttribute("aria-label", visible ? "隐藏密码" : "显示密码");
  const icon = els.accountPasswordToggle.querySelector("[data-lucide]");
  if (icon) icon.setAttribute("data-lucide", visible ? "eye-off" : "eye");
  if (window.lucide) window.lucide.createIcons();
}

const GOOGLE_OAUTH_CANCELLED_MESSAGE = "已取消 Google 登录。你可以重新选择账号，或改用邮箱登录。";

function authRedirectStatus() {
  const rawParams = [window.location.search.slice(1), window.location.hash.slice(1)].filter(Boolean);
  for (const raw of rawParams) {
    const params = new URLSearchParams(raw);
    const errorCode = (params.get("error_code") || "").toLowerCase();
    const providerError = (params.get("error") || "").toLowerCase();
    const code = errorCode || providerError;
    if (!code && !params.get("error_description")) continue;
    if (errorCode === "access_denied" || providerError === "access_denied") {
      return { message: GOOGLE_OAUTH_CANCELLED_MESSAGE, tone: "", cancelled: true };
    }
    if (code === "otp_expired") {
      return { message: "这封确认邮件已经失效。请重新发送确认邮件，并只点击最新收到的那一封。", tone: "error", cancelled: false };
    }
    return { message: params.get("error_description") || "登录确认失败，请重新尝试。", tone: "error", cancelled: false };
  }
  return null;
}

function setAccountAuthMode(mode, { keepNotice = false } = {}) {
  accountAuthMode = ["signup", "reset"].includes(mode) ? mode : "signin";
  const signingUp = accountAuthMode === "signup";
  const resetting = accountAuthMode === "reset";
  // 改密码时把登录/注册那一套整个藏起来，只留「设置新密码」一个输入框。
  els.accountAuthForm?.classList.toggle("is-resetting", resetting);
  if (els.accountNewPasswordField) els.accountNewPasswordField.hidden = !resetting;
  if (els.accountNewPassword) {
    els.accountNewPassword.required = resetting;
    if (!resetting) els.accountNewPassword.value = "";
  }
  if (els.accountForgotPassword) {
    els.accountForgotPassword.hidden = resetting || signingUp || Boolean(cloudState.user) || !cloudApi()?.configured;
  }
  if (resetting) {
    if (els.accountSignIn) els.accountSignIn.textContent = "保存新密码";
    if (els.accountResendConfirmation) els.accountResendConfirmation.hidden = true;
    setAccountPasswordVisible(false);
    if (!keepNotice && cloudApi()?.configured) setAccountNotice("");
    return;
  }
  els.accountSignInMode?.classList.toggle("is-active", !signingUp);
  els.accountSignInMode?.setAttribute("aria-selected", String(!signingUp));
  els.accountSignUp?.classList.toggle("is-active", signingUp);
  els.accountSignUp?.setAttribute("aria-selected", String(signingUp));
  if (els.accountPasswordConfirmField) els.accountPasswordConfirmField.hidden = !signingUp;
  if (els.accountPasswordConfirm) {
    els.accountPasswordConfirm.required = signingUp;
    if (!signingUp) els.accountPasswordConfirm.value = "";
  }
  if (els.accountPassword) els.accountPassword.autocomplete = signingUp ? "new-password" : "current-password";
  if (els.accountSignIn) els.accountSignIn.textContent = signingUp ? "注册" : "登录";
  if (els.accountResendConfirmation) {
    els.accountResendConfirmation.hidden = signingUp || Boolean(cloudState.user) || !cloudApi()?.configured || !pendingConfirmationEmail;
  }
  setAccountPasswordVisible(false);
  if (!keepNotice && cloudApi()?.configured) setAccountNotice("");
  void refreshGoogleSignInVisibility();
}

function accountAuthErrorMessage(error, mode) {
  const code = String(error?.code || "").toLowerCase();
  const message = String(error?.message || "").toLowerCase();
  if (mode === "signin") {
    if (code === "invalid_credentials" || message.includes("invalid login credentials")) {
      return "登录失败：邮箱尚未注册，或密码不正确。第一次使用请先切换到“注册”。";
    }
    if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
      return "账号已经创建，但邮箱还没有确认。请先打开确认邮件，再回来登录。";
    }
    return error?.message || "登录失败，请检查邮箱和密码。";
  }
  if (code === "user_already_exists" || message.includes("already registered")) {
    return "这个邮箱已经注册过，请切换到“登录”并输入原密码。";
  }
  if (code === "email_address_not_authorized" || message.includes("email address not authorized")) {
    // 这个不是「稍后再试」能解决的：说明站点还没接自定义 SMTP，
    // Supabase 内置发信只发给项目团队成员。
    return "这个站点的邮件服务还没配置好，暂时发不出确认邮件。可以先用游客模式，或者联系作者。";
  }
  if (code === "over_email_send_rate_limit" || message.includes("rate limit")) {
    return "刚刚注册的人有点多，发信排队了。请等几分钟再点一次「重新发送」。";
  }
  return error?.message || "注册失败，请稍后再试。";
}

function setAccountBusy(busy) {
  [
    els.accountEmail,
    els.accountPassword,
    els.accountPasswordToggle,
    els.accountPasswordConfirm,
    els.accountSignInMode,
    els.accountSignIn,
    els.accountSignUp,
    els.accountGoogle,
    els.accountResendConfirmation,
    els.accountSignOut,
    els.accountImportLocal,
  ]
    .filter(Boolean)
    .forEach((element) => {
      element.disabled = busy;
    });
}

function updateAccountUi() {
  const api = cloudApi();
  const configured = Boolean(api?.configured);
  const signedIn = Boolean(cloudState.user);
  const showingAddAccountForm = signedIn && accountAuthAddMode;
  els.account?.classList.toggle("is-online", signedIn && !ACCOUNT_MAINTENANCE);
  els.account?.classList.toggle("is-guest", entryState.mode === "guest" && !signedIn);
  if (els.accountLabel) {
    els.accountLabel.textContent = signedIn
      ? "已登录" : "登录 / 注册";
  }
  if (els.accountMenuTitle) {
    els.accountMenuTitle.textContent = signedIn
      ? els.displayName.value.trim() || "已登录"
      : entryState.mode === "guest"
        ? "游客模式"
        : "账号";
  }
  if (els.accountMenuDescription) {
    els.accountMenuDescription.textContent = signedIn
      ? "只同步头像昵称；请下载 ZIP 保留原稿"
      : "稿件保存在本浏览器的原稿列表";
  }
  if (els.accountMenuLogin) els.accountMenuLogin.hidden = signedIn;
  if (els.accountMenuManage) els.accountMenuManage.hidden = !signedIn;
  if (els.accountMenuSwitch) els.accountMenuSwitch.hidden = !signedIn;
  if (els.accountMenuSignOut) els.accountMenuSignOut.hidden = !signedIn;
  if (els.cloudMigration) els.cloudMigration.hidden = true;
  if (els.accountSignUp) els.accountSignUp.hidden = false;
  if (els.entryChoiceMigration) els.entryChoiceMigration.hidden = !ACCOUNT_MAINTENANCE;
  if (els.maintenanceAnnouncement) els.maintenanceAnnouncement.hidden = !ACCOUNT_MAINTENANCE;
  if (els.maintenanceWelcomeGuide) els.maintenanceWelcomeGuide.hidden = !ACCOUNT_MAINTENANCE;
  if (els.accountMenuSwitchSection) els.accountMenuSwitchSection.hidden = !signedIn;
  if (els.accountMenuHint) {
    els.accountMenuHint.textContent = signedIn
      ? "点击已登录账号即可切换；账号凭证只保存在这台浏览器。"
      : "继续使用游客模式无需操作，点击菜单外即可关闭。";
  }
  if (els.accountAuthForm) els.accountAuthForm.hidden = signedIn && !showingAddAccountForm;
  if (els.accountSignedIn) els.accountSignedIn.hidden = !signedIn || showingAddAccountForm;
  if (els.accountResendConfirmation) {
    els.accountResendConfirmation.hidden = signedIn || !configured || accountAuthMode === "signup" || !pendingConfirmationEmail;
  }

  renderAccountSessionList(els.accountMenuAccountList);
  renderAccountSessionList(els.accountModalAccountList);

  if (!configured) {
    setAccountNotice(api?.configurationError || "Supabase 尚未配置。", "");
    [els.accountEmail, els.accountPassword, els.accountPasswordConfirm, els.accountSignInMode, els.accountSignIn, els.accountSignUp]
      .filter(Boolean)
      .forEach((element) => {
      element.disabled = true;
      });
  } else if (!signedIn && els.accountConfigNotice?.textContent?.includes("Supabase")) {
    setAccountNotice("");
  }

  if (signedIn) {
    els.accountAvatar.src = els.avatarPreview?.src || state.avatar || sampleAvatar;
    els.accountDisplayName.textContent = els.displayName.value.trim() || "未命名作者";
    els.accountEmailLabel.textContent = cloudState.user.email || "";
    const localCount = cloudState.localImportProjects.length;
    els.accountImportLocal.hidden = localCount < 1 || !ACCOUNT_MAINTENANCE;
    if (localCount) els.accountImportLocal.innerHTML = `<i data-lucide="folder-input"></i>导入 ${localCount} 条游客 / 旧本机草稿到此账号`;
  }
  if (!ACCOUNT_MAINTENANCE) els.accountSignedIn?.querySelector(".account-sync-card strong")?.replaceChildren("账号资料");
  updateFeatureBadges();
  updateMigrationTestUi();
  if (window.lucide) window.lucide.createIcons();
}

function updateMigrationTestUi() {
  if (!els.migrationTestControls) return;
  els.migrationTestControls.hidden = !ACCOUNT_MAINTENANCE || LOCAL_DEPLOYMENT_MODE;
  if (els.migrationTestControls.hidden) return;
  const signedIn = isMigrationTestUser(cloudState.user);
  els.migrationTestControls.hidden = false;
  const count = cloudState.legacyProjects.length;
  const saved = savedMigrationCount();
  const written = writtenMigrationCount();
  const incomplete = incompleteMigrationCount();
  const detail = cloudState.legacyProjectsStatus === "ready"
    ? (written ? `已保存 ${saved + written}/${count} 篇` : saved ? `已核对 ${saved}/${count} 篇` : packagedMigrationCount() ? `待核对 ${packagedMigrationCount()}/${count} 篇` : incomplete ? `未完成 ${incomplete}/${count} 篇` : `${count} 篇`)
    : cloudState.legacyProjectsStatus === "error" ? "读取失败" : "读取中";
  els.migrationTestOpen.innerHTML = signedIn
    ? `<i data-lucide="folder-down"></i>迁移旧稿 <small>${detail} · 10/31 截止</small>`
    : '<i data-lucide="folder-down"></i>迁移旧稿 <small>10/31 截止</small>';
}

function migrationReceiptsStorageKey(userId) {
  return `${MIGRATION_RECEIPTS_KEY}.${String(userId || "").replace(/[^a-z0-9_-]/gi, "")}`;
}

function loadMigrationReceipts(userId) {
  try {
    const value = JSON.parse(localStorage.getItem(migrationReceiptsStorageKey(userId)) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function migrationReceiptFor(project) {
  const receipt = cloudState.migrationReceipts[project.id];
  return receipt && receipt.updatedAt === project.updatedAt ? receipt : null;
}

function savedMigrationCount() {
  return cloudState.legacyProjects.filter((project) => {
    const receipt = migrationReceiptFor(project);
    return receipt && (receipt.state === "saved" || !receipt.state);
  }).length;
}

function incompleteMigrationCount() {
  return cloudState.legacyProjects.filter((project) => migrationReceiptFor(project)?.state === "incomplete").length;
}

function packagedMigrationCount() {
  return cloudState.legacyProjects.filter((project) => migrationReceiptFor(project)?.state === "packaged").length;
}

function writtenMigrationCount() {
  return cloudState.legacyProjects.filter((project) => migrationReceiptFor(project)?.state === "written").length;
}

function recordMigrationPackage(project, archiveName) {
  if (["saved", "written"].includes(migrationReceiptFor(project)?.state)) return true;
  cloudState.migrationReceipts[project.id] = {
    state: "packaged", updatedAt: project.updatedAt, archiveName, packagedAt: new Date().toISOString(),
  };
  return persistMigrationReceipts();
}

function recordMigrationFolderSave(project, folderName, archiveName) {
  if (migrationReceiptFor(project)?.state === "saved") return true;
  cloudState.migrationReceipts[project.id] = {
    state: "written", updatedAt: project.updatedAt, folderName, archiveName, writtenAt: new Date().toISOString(),
  };
  return persistMigrationReceipts();
}

function persistMigrationReceipts() {
  try {
    localStorage.setItem(migrationReceiptsStorageKey(cloudState.user?.id), JSON.stringify(cloudState.migrationReceipts));
    return true;
  } catch {
    return false;
  }
}

function recordMigrationReceipt(project, folderName) {
  cloudState.migrationReceipts[project.id] = {
    state: "saved",
    updatedAt: project.updatedAt,
    folderName,
    savedAt: new Date().toISOString(),
  };
  return persistMigrationReceipts();
}

function recordMigrationFailure(project, message) {
  if (["saved", "written"].includes(migrationReceiptFor(project)?.state)) return true;
  cloudState.migrationReceipts[project.id] = {
    state: "incomplete",
    updatedAt: project.updatedAt,
    error: String(message || "保存未完成").slice(0, 300),
    attemptedAt: new Date().toISOString(),
  };
  return persistMigrationReceipts();
}

function openAccountModal() {
  if (LOCAL_DEPLOYMENT_MODE) return;
  closeAccountMenu();
  els.entryChoiceModal?.classList.add("hidden");
  els.maintenanceWelcome?.classList.add("hidden");
  els.accountModal.classList.remove("hidden");
  updateAccountUi();
  if (!cloudState.user || accountAuthAddMode) setAccountAuthMode(accountAuthMode, { keepNotice: true });
  if ((!cloudState.user || accountAuthAddMode) && cloudApi()?.configured) requestAnimationFrame(() => els.accountEmail.focus());
}

function closeAccountModal() {
  els.accountModal.classList.add("hidden");
  accountAuthAddMode = false;
  updateAccountUi();
  if (!entryState.resolved) showEntryChoice();
}

function setFeedbackNotice(message, type = "") {
  if (!els.feedbackNotice) return;
  els.feedbackNotice.textContent = message;
  els.feedbackNotice.classList.toggle("is-error", type === "error");
  els.feedbackNotice.classList.toggle("is-success", type === "success");
  els.feedbackNotice.classList.toggle("is-activation", type === "activation");
}

function defaultFeedbackNotice() {
  return "不会读取或上传当前草稿。";
}

function markFeedbackChanged() {
  if (!feedbackSubmissionAccepted) return;
  feedbackSubmissionAccepted = false;
  feedbackCurrentId = "";
  setFeedbackNotice(defaultFeedbackNotice());
  setFeedbackSending(false);
}

function formatFeedbackFileSize(value) {
  const bytes = Math.max(0, Number(value) || 0);
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function feedbackFilesTotalBytes() {
  return feedbackFiles.reduce((total, file) => total + file.size, 0);
}

function clearFeedbackPreviewUrls() {
  feedbackPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
  feedbackPreviewUrls = [];
}

function renderFeedbackFiles() {
  if (!els.feedbackImageList) return;
  clearFeedbackPreviewUrls();
  els.feedbackImageList.replaceChildren();

  feedbackFiles.forEach((file, index) => {
    const item = document.createElement("div");
    item.className = "feedback-image-item";
    const image = document.createElement("img");
    const previewUrl = URL.createObjectURL(file);
    feedbackPreviewUrls.push(previewUrl);
    image.src = previewUrl;
    image.alt = `反馈截图 ${index + 1}`;

    const label = document.createElement("span");
    label.textContent = `${file.name} · ${formatFeedbackFileSize(file.size)}`;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.title = `移除 ${file.name}`;
    remove.setAttribute("aria-label", `移除截图 ${index + 1}`);
    remove.disabled = feedbackSending;
    remove.innerHTML = '<i data-lucide="x"></i>';
    remove.addEventListener("click", () => {
      if (feedbackSending) return;
      markFeedbackChanged();
      feedbackFiles.splice(index, 1);
      renderFeedbackFiles();
      if (feedbackFiles.length) {
        setFeedbackNotice(`已选择 ${feedbackFiles.length} 张图片，共 ${formatFeedbackFileSize(feedbackFilesTotalBytes())}。`);
      } else {
        setFeedbackNotice(defaultFeedbackNotice());
      }
    });

    item.append(image, label, remove);
    els.feedbackImageList.append(item);
  });
  if (window.lucide) window.lucide.createIcons();
}

function addFeedbackFiles(fileList) {
  if (LOCAL_DEPLOYMENT_MODE || feedbackSending) return;
  const incoming = Array.from(fileList || []);
  let error = "";
  let added = 0;
  const seen = new Set(feedbackFiles.map((file) => `${file.name}:${file.size}:${file.lastModified}`));

  for (const file of incoming) {
    const signature = `${file.name}:${file.size}:${file.lastModified}`;
    if (seen.has(signature)) continue;
    if (!FEEDBACK_ALLOWED_IMAGE_TYPES.has(file.type)) {
      error = "只支持 PNG、JPG、WebP 或 GIF 图片。";
      continue;
    }
    if (file.size > FEEDBACK_MAX_FILE_BYTES) {
      error = `${file.name} 超过 5MB，请压缩后再上传。`;
      continue;
    }
    if (feedbackFiles.length >= FEEDBACK_MAX_FILES) {
      error = "最多只能上传 3 张图片。";
      break;
    }
    if (feedbackFilesTotalBytes() + file.size > FEEDBACK_MAX_TOTAL_BYTES) {
      error = "图片总大小不能超过 8MB，请移除或压缩后再试。";
      break;
    }
    feedbackFiles.push(file);
    seen.add(signature);
    added += 1;
    markFeedbackChanged();
  }

  if (els.feedbackImageInput) els.feedbackImageInput.value = "";
  renderFeedbackFiles();
  if (!added && !error && feedbackSubmissionAccepted) return;
  if (error) {
    setFeedbackNotice(error, "error");
  } else if (feedbackFiles.length) {
    setFeedbackNotice(`已选择 ${feedbackFiles.length} 张图片，共 ${formatFeedbackFileSize(feedbackFilesTotalBytes())}。`);
  }
}

function updateFeedbackMessageCount() {
  if (els.feedbackMessageCount && els.feedbackMessage) {
    els.feedbackMessageCount.textContent = String(els.feedbackMessage.value.length);
  }
}

function handleFeedbackFieldInput() {
  markFeedbackChanged();
  updateFeedbackMessageCount();
}

function setFeedbackSending(sending) {
  feedbackSending = Boolean(sending);
  [els.feedbackMessage, els.feedbackContact, els.feedbackImageInput]
    .filter(Boolean)
    .forEach((input) => {
      input.disabled = feedbackSending;
    });
  if (els.feedbackSubmit) {
    els.feedbackSubmit.disabled = feedbackSending || feedbackSubmissionAccepted;
    els.feedbackSubmit.classList.toggle("is-sending", feedbackSending);
    els.feedbackSubmit.innerHTML = feedbackSending
      ? '<i data-lucide="loader-circle"></i>正在发送…'
      : feedbackSubmissionAccepted
        ? '<i data-lucide="circle-check"></i>已受理'
        : '<i data-lucide="send"></i>发送反馈';
  }
  els.feedbackImageList?.querySelectorAll("button").forEach((button) => {
    button.disabled = feedbackSending;
  });
  if (els.feedbackCancel) els.feedbackCancel.textContent = feedbackSending ? "停止等待" : "取消";
  if (window.lucide) window.lucide.createIcons();
}

function feedbackModalIsOpen() {
  return Boolean(els.feedbackModal && !els.feedbackModal.classList.contains("hidden"));
}

function setDialogBackgroundInert(inert) {
  [els.workspace, document.querySelector(".site-footer")].filter(Boolean).forEach((element) => {
    element.inert = inert;
  });
}

function trapModalFocus(event, modal) {
  if (modal?.classList.contains("hidden") || event.key !== "Tab") return false;
  const focusable = Array.from(modal.querySelectorAll(
    'button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
  )).filter((element) => element.getClientRects().length > 0);
  if (!focusable.length) {
    event.preventDefault();
    modal.focus();
    return true;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
  return true;
}

function openFeedbackModal() {
  if (LOCAL_DEPLOYMENT_MODE || !els.feedbackModal) return;
  closeAccountMenu();
  feedbackReturnFocus = document.activeElement;
  setDialogBackgroundInert(true);
  els.feedbackModal.classList.remove("hidden");
  updateFeedbackMessageCount();
  requestAnimationFrame(() => els.feedbackMessage?.focus());
}

function closeFeedbackModal() {
  if (!els.feedbackModal) return;
  if (feedbackSending) feedbackAbortController?.abort();
  els.feedbackModal.classList.add("hidden");
  setDialogBackgroundInert(false);
  els.feedbackUploadDropzone?.classList.remove("is-dragging");
  const returnFocus = feedbackReturnFocus;
  feedbackReturnFocus = null;
  if (returnFocus instanceof HTMLElement) requestAnimationFrame(() => returnFocus.focus());
}

function resetFeedbackForm() {
  els.feedbackForm?.reset();
  feedbackFiles = [];
  feedbackCurrentId = "";
  feedbackSubmissionAccepted = false;
  renderFeedbackFiles();
  updateFeedbackMessageCount();
}

function createFeedbackId() {
  const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const suffix = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().replace(/-/g, "").slice(0, 6)
    : Math.random().toString(36).slice(2, 8);
  return `WTP-${timestamp}-${suffix.toUpperCase()}`;
}

async function submitFeedback(event) {
  event.preventDefault();
  if (LOCAL_DEPLOYMENT_MODE || feedbackSending) return;
  const message = els.feedbackMessage?.value.trim() || "";
  if (message.length < 5) {
    setFeedbackNotice("请至少写 5 个字，方便判断具体问题。", "error");
    els.feedbackMessage?.focus();
    return;
  }
  if (feedbackFiles.length > FEEDBACK_MAX_FILES || feedbackFilesTotalBytes() > FEEDBACK_MAX_TOTAL_BYTES) {
    setFeedbackNotice("图片数量或总大小超过限制，请调整后再发送。", "error");
    return;
  }

  const feedbackId = feedbackCurrentId || createFeedbackId();
  feedbackCurrentId = feedbackId;
  const contact = els.feedbackContact?.value.trim() || "";
  const payload = new FormData();
  payload.append("_subject", `【写了就发】问题反馈 ${feedbackId}`);
  payload.append("_template", "table");
  payload.append("_honey", els.feedbackForm?.elements?._honey?.value || "");
  payload.append("反馈编号", feedbackId);
  payload.append("问题描述", message);
  payload.append("联系方式", contact || "未填写");
  payload.append("页面版本", FEEDBACK_VERSION);
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) payload.append("email", contact);
  feedbackFiles.forEach((file, index) => payload.append(`attachment${index + 1}`, file, file.name));

  feedbackAbortController = new AbortController();
  const timeoutMs = Math.min(
    120000,
    Math.max(60000, 30000 + Math.ceil(feedbackFilesTotalBytes() / (128 * 1024)) * 1000),
  );
  const timeout = window.setTimeout(() => feedbackAbortController?.abort(), timeoutMs);
  setFeedbackSending(true);
  setFeedbackNotice("正在上传反馈和图片，请不要关闭页面。");

  try {
    const response = await fetch(FEEDBACK_ENDPOINT, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: payload,
      signal: feedbackAbortController.signal,
    });
    const raw = await response.text();
    let result = null;
    try {
      result = raw ? JSON.parse(raw) : null;
    } catch {
      result = null;
    }
    const activationRequired = /activat|confirm(?:ation)? email|verify your email/i.test(`${result?.message || ""} ${raw}`);
    if (activationRequired) {
      feedbackSubmissionAccepted = false;
      setFeedbackNotice(
        `邮件通道尚未激活。激活邮件已发送到收件箱；内容和编号 ${feedbackId} 已保留，点击激活后再提交。`,
        "activation",
      );
      return;
    }
    const accepted = response.ok && result && (result.success === true || result.success === "true");
    if (!accepted) {
      const failure = new Error(result?.message || `邮件服务暂时不可用（${response.status}）`);
      failure.confirmedFailure = true;
      throw failure;
    }

    feedbackSubmissionAccepted = true;
    setFeedbackNotice(
      `邮件服务已受理，编号 ${feedbackId}。这不等于邮箱已经送达，请以收件箱为准。`,
      "success",
    );
  } catch (error) {
    const aborted = error?.name === "AbortError";
    feedbackSubmissionAccepted = false;
    if (aborted || !error?.confirmedFailure) {
      setFeedbackNotice(
        `发送结果未确认，邮件服务可能已收到。内容和编号 ${feedbackId} 已保留，请先检查收件箱，不要立刻重复提交。`,
        "activation",
      );
    } else {
      setFeedbackNotice(`发送失败：${error?.message || "请检查网络后重试。"} 内容已保留。`, "error");
    }
  } finally {
    window.clearTimeout(timeout);
    feedbackAbortController = null;
    setFeedbackSending(false);
  }
}

function startAddingAccount() {
  if (LOCAL_DEPLOYMENT_MODE || !cloudApi()?.configured) return;
  closeAccountMenu();
  els.entryChoiceModal?.classList.add("hidden");
  els.accountModal.classList.remove("hidden");
  accountAuthAddMode = true;
  els.accountEmail.value = "";
  els.accountPassword.value = "";
  els.accountPasswordConfirm.value = "";
  setAccountAuthMode("signin", { keepNotice: true });
  setAccountNotice("登录另一个账号后会立即切换；当前账号会保留在切换列表中。", "success");
  updateAccountUi();
  requestAnimationFrame(() => els.accountEmail.focus());
}

async function waitForCloudSyncBeforeAccountSwitch() {
  const deadline = Date.now() + 120000;
  const hasPendingProfile = Boolean(cloudState.profileTimer || cloudState.pendingAvatarUpload);
  window.clearTimeout(cloudState.profileTimer);
  cloudState.profileTimer = 0;
  while (cloudState.syncingProfile && Date.now() < deadline) {
    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }
  if (cloudState.syncingProfile) {
    throw new Error("当前账号资料仍在同步，请稍后再切换。");
  }
  if (hasPendingProfile || cloudState.pendingAvatarUpload) await flushCloudProfileSync();
  if (cloudState.pendingAvatarUpload || cloudState.syncingProfile) {
    throw new Error("当前账号资料仍未同步，请稍后再切换。");
  }
}

// Supabase 的 refresh token 是一次性的：轮换之后再拿旧 token 换登录态，
// 服务端会回 Invalid Refresh Token: Already Used / Not Found 这类错误。
function accountSessionTokenIsStale(error) {
  const text = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();
  return text.includes("refresh token")
    || text.includes("refresh_token")
    || text.includes("already used")
    || text.includes("invalid_grant");
}

async function switchToStoredAccount(userId) {
  const targetId = String(userId || "");
  if (!targetId || targetId === cloudState.user?.id) {
    closeAccountMenu();
    return;
  }
  const snapshot = readStoredAccountSessions().find((item) => item.userId === targetId);
  if (!snapshot) {
    setAccountNotice("这个账号的本机登录记录不存在，请重新登录一次。", "error");
    openAccountModal();
    return;
  }
  if (!cloudApi()?.setSession) {
    setAccountNotice("当前版本还不支持账号切换，请刷新页面后重试。", "error");
    openAccountModal();
    return;
  }

  closeAccountMenu();
  setAccountBusy(true);
  cloudState.switchingAccount = true;
  els.status.textContent = `正在切换到 ${accountSessionName(snapshot)}…`;
  try {
    await waitForCloudSyncBeforeAccountSwitch();
    // 离开当前账号前，把它此刻真实的 token 存回本机，避免下次切回来时用到旧的。
    const currentSession = await cloudApi().getSession().catch(() => null);
    if (currentSession?.user && currentSession.user.id !== targetId) {
      rememberAccountSession(currentSession);
    }
    const result = await cloudApi().setSession({
      access_token: snapshot.accessToken,
      refresh_token: snapshot.refreshToken,
    });
    if (!result?.session?.user) throw new Error("账号切换失败，请重新登录这个账号。");
    rememberAccountSession(result.session);
    await handleCloudSession(result.session);
    localStorage.setItem(LAST_ACCOUNT_EMAIL_KEY, snapshot.email || "");
    sessionStorage.removeItem(ENTRY_MODE_SESSION_KEY);
    entryState.mode = "account";
    entryState.resolved = true;
    updateAccountUi();
    closeAccountModal();
    els.status.textContent = `已切换到 ${accountSessionName(snapshot)} 的本机工作区`;
  } catch (error) {
    console.error("账号切换失败", error);
    // 登录状态已失效时，本机这条记录已经没用了；留着只会让用户反复撞同一个错。
    const staleToken = accountSessionTokenIsStale(error);
    if (staleToken) {
      removeStoredAccountSession(targetId);
      localStorage.setItem(LAST_ACCOUNT_EMAIL_KEY, snapshot.email || "");
    }
    if (staleToken && cloudState.user) {
      startAddingAccount();
      els.accountEmail.value = snapshot.email || "";
    } else {
      openAccountModal();
    }
    setAccountNotice(
      staleToken
        ? `${accountSessionName(snapshot)} 的本机登录状态已过期，请重新登录一次这个账号。`
        : error?.message || "账号切换失败，请重新登录这个账号。",
      "error",
    );
  } finally {
    cloudState.switchingAccount = false;
    setAccountBusy(false);
    updateAccountUi();
  }
}

function accountMenuIsOpen() {
  return Boolean(els.accountMenu && !els.accountMenu.classList.contains("hidden"));
}

function openAccountMenu() {
  if (LOCAL_DEPLOYMENT_MODE) return;
  updateAccountUi();
  els.accountMenu?.classList.remove("hidden");
  els.account?.setAttribute("aria-expanded", "true");
}

function closeAccountMenu() {
  els.accountMenu?.classList.add("hidden");
  els.account?.setAttribute("aria-expanded", "false");
}

function toggleAccountMenu() {
  if (!cloudState.user) { openAccountModal(); return; }
  if (accountMenuIsOpen()) closeAccountMenu();
  else openAccountMenu();
}

function experienceSubject() {
  return cloudState.user?.id ? accountScope(cloudState.user.id) : "guest";
}

function experienceStorageKey(baseKey) {
  return `${baseKey}.${experienceSubject()}`;
}

function experienceVersionIsStored(baseKey) {
  try {
    return localStorage.getItem(experienceStorageKey(baseKey)) === EXPERIENCE_VERSION;
  } catch {
    return false;
  }
}

function storeExperienceVersion(baseKey) {
  try {
    localStorage.setItem(experienceStorageKey(baseKey), EXPERIENCE_VERSION);
  } catch {
    // The experience continues even if version memory is unavailable.
  }
}

function experiencePreviewMode() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("welcome") === "1") return "welcome";
    if (params.get("whatsnew") === "1") return "whats-new";
  } catch {
    // Ignore malformed preview URLs.
  }
  return "";
}

function firstRunTourIsForced() {
  try {
    return new URLSearchParams(window.location.search).get("tour") === "1";
  } catch {
    return false;
  }
}

function workspaceHasReturningData() {
  if (state.projects.length) return true;
  try {
    if (localStorage.getItem(ONBOARDING_STORAGE_KEY) === "completed") return true;
  } catch {
    // Continue with project-store checks.
  }
  return loadProjectStoreForScope("guest").projects.length > 0
    || loadProjectStoreForScope("local").projects.length > 0;
}

function loadAuthorProfileForScope(scope) {
  const previousScope = activeStorageScope;
  activeStorageScope = scope;
  const profile = loadStoredAuthorProfile();
  activeStorageScope = previousScope;
  return profile;
}

async function activateGuestWorkspace({ restoreLegacy = true } = {}) {
  const guestStore = loadProjectStoreForScope("guest");
  const legacyStore = loadProjectStoreForScope("local");
  if (restoreLegacy && !guestStore.projects.length && legacyStore.projects.length) {
    const legacyProfile = loadAuthorProfileForScope("local");
    const profileRow = legacyProfile
      ? {
          display_name: legacyProfile.displayName,
          handle: legacyProfile.handle,
          avatar_url: legacyProfile.avatar,
          avatar_crop: legacyProfile.avatarCrop,
        }
      : null;
    await activateWorkspaceScope("guest", legacyStore.projects, profileRow);
    return;
  }
  await activateWorkspaceScope("guest");
}

function updateFeatureBadges() {
  const acknowledged = experienceVersionIsStored(WHATS_NEW_STORAGE_KEY);
  els.featureBadges.forEach((badge) => {
    const accountOnly = badge.dataset.featureBadge === "account";
    badge.hidden = !entryState.resolved || acknowledged || (accountOnly && Boolean(cloudState.user));
  });
}

function welcomeBackIsOpen() {
  return Boolean(els.welcomeBackModal && !els.welcomeBackModal.classList.contains("hidden"));
}

function openWelcomeBack() {
  closeAccountMenu();
  finishOnboarding({ remember: false });
  if (els.welcomeBackAccountState) {
    els.welcomeBackAccountState.textContent = cloudState.user ? "已开启" : "可选开启";
  }
  els.welcomeBackModal?.classList.remove("hidden");
  if (window.lucide) window.lucide.createIcons();
}

function closeWelcomeBack({ startTour = false } = {}) {
  if (!welcomeBackIsOpen() && !startTour) return;
  storeExperienceVersion(WELCOME_BACK_STORAGE_KEY);
  els.welcomeBackModal?.classList.add("hidden");
  updateFeatureBadges();
  if (startTour) window.setTimeout(startWhatsNewTour, 120);
}

async function showGuideProjectForDemo() {
  const guideProject = findHistoryProject(GUIDE_CARDS_PROJECT_ID);
  if (!guideProject) return;
  state.currentProjectId = guideProject.id;
  applyForm(guideProject.data);
  syncGuideReadOnlyMode();
  resetTextHistory();
  updateProjectHistory();
  await render();
  els.status.textContent = "演示模式：正在展示内置《图文卡片说明书》";
}

async function presentPostEntryExperience() {
  if (!entryState.resolved) return;
  if (ACCOUNT_MAINTENANCE) return;
  const previewMode = experiencePreviewMode();
  updateFeatureBadges();
  if (firstRunTourIsForced()) {
    await showGuideProjectForDemo();
    onboardingMode = "first-run";
    showOnboardingStep(0);
    return;
  }
  if (previewMode === "whats-new") {
    await showGuideProjectForDemo();
    startWhatsNewTour();
    return;
  }
  if (previewMode === "welcome" || (entryState.returning && !experienceVersionIsStored(WELCOME_BACK_STORAGE_KEY))) {
    if (previewMode === "welcome") await showGuideProjectForDemo();
    openWelcomeBack();
    return;
  }
  if (!entryState.returning) maybeStartOnboarding();
}

function setEntryChoiceNotice(message = "", tone = "") {
  if (!els.entryChoiceNotice) return;
  els.entryChoiceNotice.hidden = !message;
  els.entryChoiceNotice.textContent = message;
  els.entryChoiceNotice.className = `entry-choice-notice${tone ? ` ${tone}` : ""}`;
}

function showEntryChoice(message = "", tone = "") {
  closeAccountMenu();
  entryState.mode = "pending";
  entryState.resolved = false;
  document.body.classList.add("entry-choice-pending");
  els.entryChoiceModal?.classList.add("hidden");
  els.maintenanceWelcome?.classList.remove("hidden");
  if (els.entryChoiceLoading) els.entryChoiceLoading.hidden = true;
  if (els.entryChoiceContent) els.entryChoiceContent.hidden = false;
  setEntryChoiceNotice(message, tone);
  const lastEmail = localStorage.getItem(LAST_ACCOUNT_EMAIL_KEY) || "";
  if (els.entryChoiceReturningHint) {
    els.entryChoiceReturningHint.hidden = !lastEmail;
    els.entryChoiceReturningHint.textContent = lastEmail ? `上次登录：${lastEmail}` : "";
  }
  updateAccountUi();
  if (window.lucide) window.lucide.createIcons();
}

function finishEntryChoice(mode, { returning = null } = {}) {
  entryState.mode = mode;
  entryState.resolved = true;
  entryState.returning = returning == null ? workspaceHasReturningData() : Boolean(returning);
  els.entryChoiceModal?.classList.add("hidden");
  els.maintenanceWelcome?.classList.add("hidden");
  els.accountModal?.classList.add("hidden");
  document.body.classList.remove("entry-choice-pending", "cloud-session-checking");
  updateAccountUi();
  window.setTimeout(() => void presentPostEntryExperience(), 180);
}

function clearRememberedAccountIdentity() {
  for (const [storage, keys] of [
    [localStorage, [ACCOUNT_SESSIONS_STORAGE_KEY, LAST_ACCOUNT_EMAIL_KEY]],
    [sessionStorage, [GOOGLE_OAUTH_PENDING_SESSION_KEY, ACCOUNT_ADD_PENDING_SESSION_KEY, MIGRATION_AUTH_PENDING_KEY]],
  ]) {
    for (const key of keys) {
      try { storage.removeItem(key); }
      catch { /* 隐私模式可能禁止写入本机存储。 */ }
    }
  }
  pendingConfirmationEmail = "";
  accountAuthAddMode = false;
  accountAuthMode = "signin";
  migrationTestAuthMode = "signin";
  for (const input of [els.accountEmail, els.accountPassword, els.accountPasswordConfirm, els.accountNewPassword,
    els.migrationTestEmail, els.migrationTestPassword]) {
    if (input) input.value = "";
  }
}

async function chooseGuestMode() {
  if (cloudState.user) {
    cloudState.signingOut = true;
    try {
      await cloudApi().signOutLocal();
      await handleCloudSession(null);
    } finally { cloudState.signingOut = false; }
  }
  clearRememberedAccountIdentity();
  sessionStorage.setItem(ENTRY_MODE_SESSION_KEY, "guest");
  await activateGuestWorkspace();
  finishEntryChoice("guest");
  els.status.textContent = ACCOUNT_MAINTENANCE
    ? "游客模式 · 稿件保存在本浏览器，不上传云端"
    : "游客模式：稿件保存在本浏览器的原稿列表";
}

function hasSeenMaintenanceWelcome() {
  try { return localStorage.getItem(MAINTENANCE_WELCOME_KEY) === "seen"; }
  catch { return false; }
}

function showMaintenanceWelcomeOnce() {
  if (!ACCOUNT_MAINTENANCE || LOCAL_DEPLOYMENT_MODE || !els.maintenanceWelcome) return false;
  try {
    const preview = ["localhost", "127.0.0.1"].includes(window.location.hostname)
      && new URLSearchParams(window.location.search).get("welcome-preview") === "1";
    if (!preview && hasSeenMaintenanceWelcome()) return false;
  } catch {
    // 私密浏览窗口可能禁用本地存储；仍然先展示重要公告。
  }
  els.entryChoiceModal?.classList.add("hidden");
  els.maintenanceWelcome.classList.remove("hidden");
  els.maintenanceWelcomeStart?.focus();
  return true;
}

function finishMaintenanceWelcome() {
  els.maintenanceWelcome?.classList.add("hidden");
  try {
    localStorage.setItem(MAINTENANCE_WELCOME_KEY, "seen");
  } catch {
    // 无法持久记住时，下次访问会再次展示公告。
  }
}

function setMigrationTestNotice(message = "", error = false) {
  if (!els.migrationTestNotice) return;
  els.migrationTestNotice.hidden = !message;
  els.migrationTestNotice.textContent = message;
  els.migrationTestNotice.classList.toggle("is-error", error);
}

async function refreshMigrationTestGoogle() {
  if (!MIGRATION_TEST_MODE || !els.migrationTestGoogle) return;
  const api = cloudApi();
  const available = await api?.googleSignInAvailable(true);
  els.migrationTestGoogle.hidden = migrationTestAuthMode === "signup" || !available;
  if (api?.isServiceRestricted?.() && !els.migrationTestNotice.textContent) {
    setMigrationTestNotice("云端服务目前受存储额度限制，暂时无法登录。", true);
  }
}

function setMigrationTestAuthMode(mode) {
  migrationTestAuthMode = mode === "signup" ? "signup" : "signin";
  const signingUp = migrationTestAuthMode === "signup";
  els.migrationTestSignInMode?.classList.toggle("is-active", !signingUp);
  els.migrationTestSignInMode?.setAttribute("aria-selected", String(!signingUp));
  els.migrationTestSignUpMode?.classList.toggle("is-active", signingUp);
  els.migrationTestSignUpMode?.setAttribute("aria-selected", String(signingUp));
  els.migrationTestEmailSignIn.textContent = signingUp ? "注册" : "邮箱登录";
  els.migrationTestPassword.hidden = signingUp;
  els.migrationTestPassword.required = !signingUp;
  els.migrationTestGoogle.hidden = true;
  setMigrationTestNotice(signingUp ? "此入口用于迁移旧记录。新用户请通过「登录 / 注册」创建账号。" : "");
  if (!signingUp) void refreshMigrationTestGoogle();
}

function openMigrationTestLogin() {
  if (LOCAL_DEPLOYMENT_MODE) return;
  if (!ACCOUNT_MAINTENANCE) {
    els.status.textContent = "迁移期已结束，请从左上角导入保存的 ZIP 原稿。";
    return;
  }
  closeAccountMenu();
  els.entryChoiceModal?.classList.add("hidden");
  els.maintenanceWelcome?.classList.add("hidden");
  els.accountModal?.classList.add("hidden");
  if (isMigrationTestUser(cloudState.user)) {
    openCloudMigrationModal();
    return;
  }
  els.migrationTestEmail.value = "";
  els.migrationTestPassword.value = "";
  setMigrationTestAuthMode("signin");
  els.migrationTestModal.classList.remove("hidden");
  requestAnimationFrame(() => els.migrationTestEmail.focus());
}

function closeMigrationTestLogin() {
  els.migrationTestModal?.classList.add("hidden");
  if (!entryState.resolved) showEntryChoice();
}

function setMigrationTestBusy(busy) {
  [els.migrationTestGoogle, els.migrationTestEmail, els.migrationTestPassword,
    els.migrationTestEmailSignIn, els.migrationTestSignInMode, els.migrationTestSignUpMode]
    .filter(Boolean).forEach((element) => { element.disabled = busy; });
}

async function finishMigrationTestLogin(session, { openMigration = true } = {}) {
  if (!isMigrationTestUser(session?.user)) {
    if (session?.user) {
      try { await cloudApi().signOutLocal(); } catch { /* 无效或已过期的迁移会话不能进入旧稿工作区。 */ }
    }
    throw new Error("旧稿迁移期已结束；请使用登录 / 注册入口同步账号资料。");
  }
  await loadCloudWorkspace(session);
  finishEntryChoice("account", { returning: true });
  closeMigrationTestLogin();
  if (openMigration) {
    openCloudMigrationModal();
  }
  updateMigrationTestUi();
}

async function signInMigrationTestWithEmail(event) {
  event.preventDefault();
  const email = els.migrationTestEmail.value.trim().toLowerCase();
  if (migrationTestAuthMode === "signup") {
    setMigrationTestNotice("此入口用于迁移旧记录。新用户请通过「登录 / 注册」创建账号。", true);
    return;
  }
  const password = els.migrationTestPassword.value;
  if (!password) return;
  setMigrationTestBusy(true);
  setMigrationTestNotice("正在登录旧账号…");
  try {
    const result = await cloudApi().signIn(email, password);
    await finishMigrationTestLogin(result.session);
    els.migrationTestPassword.value = "";
  } catch (error) {
    setMigrationTestNotice(
      isCloudRestrictedMessage(error?.message)
        ? "云端服务目前受存储额度限制，暂时无法登录。"
        : error?.message || "登录失败，请检查原密码。",
      true,
    );
  } finally {
    setMigrationTestBusy(false);
  }
}

async function signInMigrationTestWithGoogle() {
  setMigrationTestBusy(true);
  setMigrationTestNotice("正在跳转到 Google…");
  try {
    sessionStorage.setItem(MIGRATION_AUTH_PENDING_KEY, "1");
    await cloudApi().signInWithGoogle(true);
    setMigrationTestNotice("正在跳转，完成后会回到迁移页面。");
    setMigrationTestBusy(false);
  } catch (error) {
    sessionStorage.removeItem(MIGRATION_AUTH_PENDING_KEY);
    setMigrationTestNotice(error?.message || "Google 登录暂时不可用。", true);
    setMigrationTestBusy(false);
  }
}

async function signOutMigrationTest() {
  if (!isMigrationTestUser(cloudState.user)) return;
  await signOutAccount();
}

function chooseLoginMode() {
  if (cloudState.user) {
    finishEntryChoice("account", { returning: true });
    return;
  }
  if (!cloudApi()?.configured) {
    openAccountModal();
    setAccountNotice(cloudApi()?.configurationError || "站点管理员尚未启用登录功能。", "");
    return;
  }
  openAccountModal();
}

function cloudProjectFromRow(row) {
  const updatedAt = Date.parse(row.updated_at) || Date.now();
  return normalizeProject({
    id: row.id,
    title: row.title,
    updatedAt,
    data: row.data,
  });
}

/** blob: 链接刷新即失效（旧版本本机缓存里的云端图片全是这种），当作没有。 */
function isPersistableImageSource(src) {
  return typeof src === "string" && src.length > 0 && !src.startsWith("blob:");
}

/** 把云端素材补到本机，返回没下载成功的数量。 */
async function hydrateCloudProject(project) {
  const api = cloudApi();
  const images = project?.data?.images;
  if (!api?.configured || !images || typeof images !== "object") return 0;
  let failed = 0;
  await Promise.all(
    Object.entries(images).map(async ([id, image]) => {
      if (!image || typeof image !== "object") return;
      try {
        if (image.storagePath && !isPersistableImageSource(image.src)) {
          // 本机 IndexedDB 里已有就直接用，不花云端流量
          const local = image.srcKey ? await readImageSource(image.srcKey).catch(() => null) : null;
          if (local) {
            image.src = local;
          } else {
            // 存成 data URL 而不是 blob 链接：saveProjectStore 会把它写进 IndexedDB，刷新后还在
            const blob = await api.downloadProjectAsset(image.storagePath);
            image.src = await readFileAsDataURL(blob);
          }
        }
        if (image.kind === "live" && image.videoStoragePath) {
          const key = String(image.videoKey || id);
          // 本机内存或 IndexedDB 里已经有这段原视频就直接用，不再从云端下：
          // 之前这里无条件下载，每次登录都会把整段视频重新拉一遍，流量额度就是这么耗光的。
          const cached = liveMediaFiles.get(key)?.blob || await readLiveMediaBlob(key).catch(() => null);
          if (cached) {
            if (!liveMediaFiles.get(key)?.blob) replaceLiveMediaCache(key, cached, image.videoName || "video.mov");
          } else {
            const videoBlob = await api.downloadProjectAsset(image.videoStoragePath);
            await writeLiveMediaBlob(key, videoBlob);
            replaceLiveMediaCache(key, videoBlob, image.videoName || "video.mov");
          }
        }
      } catch (error) {
        failed += 1;
        console.error("云端素材读取失败", error);
      }
    }),
  );
  return failed;
}

// 新稿只存在本机；旧云端稿仅在用户选择具体项目时读取素材。
// 同一项目的素材下载去重。
const hydratingCloudProjects = new Map();

function hydrateCloudProjectOnce(project) {
  const key = project?.id;
  if (!key) return hydrateCloudProject(project);
  if (!hydratingCloudProjects.has(key)) {
    hydratingCloudProjects.set(
      key,
      hydrateCloudProject(project).finally(() => hydratingCloudProjects.delete(key)),
    );
  }
  return hydratingCloudProjects.get(key);
}

async function activateWorkspaceScope(scope, projects = null, profile = null) {
  cloudState.loadingWorkspace = true;
  folderDraftSync.generation += 1;
  activeStorageScope = scope;
  if (scope === "guest") migrateGuestSessionStore();
  buildSelectionSwatches("color");
  buildSelectionSwatches("bg");
  try {
    if (profile) {
      const localProfile = loadStoredAuthorProfile();
      const normalizedProfile = normalizeAuthorProfile({
        displayName: profile.display_name,
        handle: localProfile?.handle,
        avatar: profile.avatar_url || localProfile?.avatar || sampleAvatar,
        avatarCrop: localProfile?.avatarCrop,
      });
      cloudState.profileAvatarUrl = profile.avatar_url || "";
      authorProfileStorage().setItem(scopedStorageKey(AUTHOR_PROFILE_STORAGE_KEY), JSON.stringify(normalizedProfile));
    } else {
      cloudState.profileAvatarUrl = "";
    }

    if (Array.isArray(projects)) {
      const list = projects.filter(Boolean).slice(0, MAX_PROJECTS);
      state.projects = list;
      state.currentProjectId = state.projects[0]?.id || GUIDE_CARDS_PROJECT_ID;
      saveProjectStore();
    } else {
      const store = loadProjectStore();
      state.projects = store.projects;
      state.currentProjectId = store.activeId || store.projects[0]?.id || GUIDE_CARDS_PROJECT_ID;
    }

    const data = findHistoryProject(state.currentProjectId)?.data || findHistoryProject(GUIDE_CARDS_PROJECT_ID)?.data || defaultFormState();
    applyForm(data);
    syncGuideReadOnlyMode();
    resetTextHistory();
    updateProjectHistory();
    await render();
  } finally {
    cloudState.loadingWorkspace = false;
  }
  void syncFolderDrafts();
}

async function loadCloudWorkspace(session) {
  const api = cloudApi();
  const user = session?.user;
  if (!api?.configured || !user) return;
  if (cloudState.loadingUserId === user.id) return;
  cloudState.loadingUserId = user.id;
  cloudState.session = session;
  cloudState.user = user;
  cloudState.legacyProjects = [];
  cloudState.legacyProjectsStatus = ACCOUNT_MAINTENANCE ? "loading" : "closed";
  cloudState.migrationReceipts = loadMigrationReceipts(user.id);
  const guestProjects = loadProjectStoreForScope("guest").projects;
  const legacyProjects = loadProjectStoreForScope("local").projects;
  cloudState.localImportProjects = [...guestProjects, ...legacyProjects]
    .filter((project, index, projects) => projects.findIndex((item) => item.id === project.id) === index)
    .slice(0, MAX_PROJECTS);
  setAccountBusy(true);
  if (els.accountSyncStatus) els.accountSyncStatus.textContent = "正在读取账号数据…";
  updateAccountUi();
  try {
    const [profileResult, projectsResult] = await Promise.allSettled([
      api.getProfile(), ACCOUNT_MAINTENANCE ? api.listProjects() : Promise.resolve([]),
    ]);
    if (cloudState.user?.id !== user.id) return;
    if (projectsResult.status === "fulfilled") {
      try {
        cloudState.legacyProjects = projectsResult.value.map(cloudProjectFromRow).filter(Boolean);
        cloudState.legacyProjectsStatus = ACCOUNT_MAINTENANCE ? "ready" : "closed";
      } catch (error) {
        cloudState.legacyProjectsStatus = "error";
        throw error;
      }
    } else {
      cloudState.legacyProjectsStatus = "error";
    }
    renderCloudMigrationList();
    updateMigrationAllButton();
    updateCloudMigrationStatus();
    updateAccountUi();
    if (profileResult.status === "rejected") throw profileResult.reason;
    let resolvedProfile = profileResult.value;
    if (!resolvedProfile) {
      const cached = loadStoredAuthorProfile() || normalizeAuthorProfile({
        displayName: user.user_metadata?.full_name || user.email?.split("@")[0] || "未命名作者",
        handle: "",
      });
      resolvedProfile = await api.upsertProfile(cached);
    }
    // 本机稿独立打开；云端旧稿留在迁移清单，避免登录时自动拉取全部素材。
    await activateWorkspaceScope(accountScope(user.id), null, resolvedProfile);
    if (projectsResult.status === "rejected") throw projectsResult.reason;
    els.accountSyncStatus.textContent = "仅头像、昵称同步到账号；文章和素材只保存在本机，请保留 ZIP 原稿。";
    setAccountNotice("");
  } catch (error) {
    console.error(error);
    if (activeStorageScope !== accountScope(user.id)) {
      await activateWorkspaceScope(accountScope(user.id));
    }
    setAccountNotice(error?.message || "云端数据读取失败，请检查数据库初始化是否完成。", "error");
    els.accountSyncStatus.textContent = !ACCOUNT_MAINTENANCE
      ? "头像昵称暂未同步；文章和素材仍保存在本机。"
      : cloudState.legacyProjectsStatus === "ready"
      ? `已找到 ${cloudState.legacyProjects.length} 篇云端旧稿；账号资料未加载完成`
      : isCloudRestrictedMessage(error?.message) ? "云端同步维护中，本机草稿照常可用" : "旧稿清单读取失败，请刷新重试";
  } finally {
    cloudState.loadingUserId = "";
    setAccountBusy(false);
    updateAccountUi();
  }
}

async function handleCloudSession(session) {
  const nextUserId = session?.user?.id || "";
  if (session?.user) rememberAccountSession(session);
  if (nextUserId && cloudState.user?.id === nextUserId && activeStorageScope === accountScope(nextUserId)) {
    cloudState.session = session;
    updateAccountUi();
    return;
  }
  if (session?.user) {
    await loadCloudWorkspace(session);
    return;
  }

  cloudState.session = null;
  cloudState.user = null;
  cloudState.profileAvatarUrl = "";
  cloudState.localImportProjects = [];
  cloudState.legacyProjects = [];
  cloudState.legacyProjectsStatus = "idle";
  cloudState.migrationReceipts = {};
  closeCloudMigrationModal();
  updateAccountUi();
}

async function initializeCloudAccount() {
  await resolveAccountPolicy();
  if (LOCAL_DEPLOYMENT_MODE) {
    document.body.classList.add("local-deployment");
    document.body.classList.remove("cloud-session-checking");
    cloudState.initialized = true;
    activeStorageScope = "local";
    const returning = workspaceHasReturningData();
    await activateWorkspaceScope("local");
    finishEntryChoice("local", { returning });
    els.status.textContent = "本地版：草稿只保存在这台电脑当前浏览器中";
    return;
  }
  document.body.classList.toggle("migration-period", ACCOUNT_MAINTENANCE);
  const api = cloudApi();
  const redirectStatus = authRedirectStatus();
  const googleOAuthWasPending = takeGoogleOAuthPending();
  const accountAddWasPending = takeAccountAddPending();
  const migrationWasPending = sessionStorage.getItem(MIGRATION_AUTH_PENDING_KEY) === "1";
  const recoveringPassword = new URLSearchParams(window.location.search).has("reset");
  sessionStorage.removeItem(MIGRATION_AUTH_PENDING_KEY);
  document.body.classList.toggle("cloud-session-checking", Boolean(api?.configured));
  updateAccountUi();
  cloudState.initialized = true;
  if (experiencePreviewMode() || firstRunTourIsForced()) {
    document.body.classList.remove("cloud-session-checking");
    activeStorageScope = "guest";
    await showGuideProjectForDemo();
    finishEntryChoice("guest", { returning: true });
    return;
  }
  if (!api?.configured) {
    document.body.classList.remove("cloud-session-checking");
    if (sessionStorage.getItem(ENTRY_MODE_SESSION_KEY) === "guest" || hasSeenMaintenanceWelcome()) {
      await chooseGuestMode();
    } else if (experiencePreviewMode() || workspaceHasReturningData()) {
      sessionStorage.setItem(ENTRY_MODE_SESSION_KEY, "guest");
      await chooseGuestMode();
    } else {
      showEntryChoice();
    }
    showMaintenanceWelcomeOnce();
    return;
  }
  api.onAuthStateChange((event, session) => {
    // 点重置邮件回来时 supabase-js 会先给一个临时会话再抛这个事件，
    // 这里必须把界面切到「设置新密码」，否则用户只是莫名其妙被登录了。
    if (event === "PASSWORD_RECOVERY") {
      window.setTimeout(() => {
        openAccountModal();
        setAccountAuthMode("reset");
        setAccountNotice("请设置一个新密码，保存后即可用它登录。");
      }, 0);
      return;
    }
    // Supabase 每次自动刷新都会轮换 refresh token 并作废旧的。不接住这个事件，
    // 本机快照会一直停在最初那个已作废的 token，之后切回这个账号必然失败。
    if (event === "TOKEN_REFRESHED") {
      if (session?.user) rememberAccountSession(session);
      return;
    }
    if (!["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) return;
    if (event === "SIGNED_OUT") {
      if (!cloudState.signingOut && !cloudState.switchingAccount && entryState.mode === "account") {
        window.setTimeout(async () => {
          await handleCloudSession(null);
          await activateWorkspaceScope("guest");
          sessionStorage.removeItem(ENTRY_MODE_SESSION_KEY);
          showEntryChoice("登录状态已结束，请重新选择使用方式。");
        }, 0);
      }
      return;
    }
    window.setTimeout(async () => {
      await handleCloudSession(session);
      if (!session?.user) return;
      if (accountAuthAddMode) {
        accountAuthAddMode = false;
        entryState.mode = "account";
        entryState.resolved = true;
        closeAccountModal();
        els.status.textContent = "已添加账号并切换到对应的本机工作区";
        return;
      }
      if (entryState.mode === "account" && entryState.resolved) return;
      finishEntryChoice("account");
    }, 0);
  });
  try {
    const session = await api.getSession();
    if (session?.user) {
      await handleCloudSession(session);
      if (accountAddWasPending) {
        entryState.mode = "account";
        entryState.resolved = true;
        entryState.returning = true;
        els.entryChoiceModal?.classList.add("hidden");
        els.accountModal?.classList.add("hidden");
        document.body.classList.remove("entry-choice-pending", "cloud-session-checking");
        updateAccountUi();
        els.status.textContent = "已添加账号并切换到对应的本机工作区";
      } else {
        finishEntryChoice("account");
      }
      if (migrationWasPending && ACCOUNT_MAINTENANCE) openCloudMigrationModal();
    } else if (migrationWasPending) {
      showEntryChoice();
      openMigrationTestLogin();
      setMigrationTestNotice(redirectStatus?.message || GOOGLE_OAUTH_CANCELLED_MESSAGE, Boolean(redirectStatus?.tone === "error"));
    } else if (redirectStatus) {
      const lastEmail = localStorage.getItem(LAST_ACCOUNT_EMAIL_KEY) || "";
      setPendingConfirmation(lastEmail);
      showEntryChoice();
      window.setTimeout(() => {
        openAccountModal();
        setAccountAuthMode("signin", { keepNotice: true });
        setAccountNotice(redirectStatus.message, redirectStatus.tone);
      }, 0);
    } else if (googleOAuthWasPending) {
      showEntryChoice();
      window.setTimeout(() => {
        openAccountModal();
        setAccountAuthMode("signin", { keepNotice: true });
        setAccountNotice(GOOGLE_OAUTH_CANCELLED_MESSAGE);
      }, 0);
    } else if (sessionStorage.getItem(ENTRY_MODE_SESSION_KEY) === "guest" || hasSeenMaintenanceWelcome()) {
      await chooseGuestMode();
    } else if (experiencePreviewMode() || workspaceHasReturningData()) {
      sessionStorage.setItem(ENTRY_MODE_SESSION_KEY, "guest");
      await chooseGuestMode();
    } else {
      showEntryChoice();
    }
  } catch (error) {
    setAccountNotice(error?.message || "登录状态读取失败。", "error");
    if (experiencePreviewMode() || firstRunTourIsForced()) {
      sessionStorage.setItem(ENTRY_MODE_SESSION_KEY, "guest");
      await activateGuestWorkspace();
      finishEntryChoice("guest", { returning: true });
    } else {
      showEntryChoice(
        isCloudRestrictedMessage(error?.message) ? CLOUD_RESTRICTED_NOTICE : "暂时无法检查登录状态，你仍可先使用游客模式。",
        "error",
      );
    }
  } finally {
    document.body.classList.remove("cloud-session-checking");
    if (ACCOUNT_MAINTENANCE && !migrationWasPending && !recoveringPassword && !redirectStatus && !googleOAuthWasPending) showMaintenanceWelcomeOnce();
  }
}

async function signInAccount() {
  const email = els.accountEmail.value.trim();
  const password = els.accountPassword.value;
  if (!email || password.length < 8) {
    setAccountNotice("请输入邮箱和至少 8 位密码。", "error");
    return;
  }
  setAccountBusy(true);
  setAccountNotice("正在登录…");
  const addingAccount = accountAuthAddMode;
  try {
    const result = await cloudApi().signIn(email, password);
    await handleCloudSession(result.session);
    localStorage.setItem(LAST_ACCOUNT_EMAIL_KEY, email);
    setPendingConfirmation("");
    sessionStorage.removeItem(ENTRY_MODE_SESSION_KEY);
    if (addingAccount) {
      accountAuthAddMode = false;
      entryState.mode = "account";
      entryState.resolved = true;
      closeAccountModal();
      els.status.textContent = "已添加账号并切换到对应的本机工作区";
    } else {
      finishEntryChoice("account");
    }
    els.accountPassword.value = "";
    if (!addingAccount) setAccountNotice("登录成功，已切换到你的本机工作区。", "success");
  } catch (error) {
    setAccountNotice(accountAuthErrorMessage(error, "signin"), "error");
  } finally {
    setAccountBusy(false);
  }
}

async function signUpAccount() {
  const email = els.accountEmail.value.trim();
  const password = els.accountPassword.value;
  if (!email || password.length < 8) {
    setAccountNotice("请输入邮箱和至少 8 位密码。", "error");
    return;
  }
  if (password !== els.accountPasswordConfirm.value) {
    setAccountNotice("两次输入的密码不一致，请重新确认。", "error");
    els.accountPasswordConfirm.focus();
    return;
  }
  setAccountBusy(true);
  setAccountNotice("正在创建账号…");
  const addingAccount = accountAuthAddMode;
  try {
    const result = await cloudApi().signUp(email, password);
    localStorage.setItem(LAST_ACCOUNT_EMAIL_KEY, email);
    if (result.session) {
      await handleCloudSession(result.session);
      localStorage.setItem(LAST_ACCOUNT_EMAIL_KEY, email);
      sessionStorage.removeItem(ENTRY_MODE_SESSION_KEY);
      if (addingAccount) {
        accountAuthAddMode = false;
        entryState.mode = "account";
        entryState.resolved = true;
        closeAccountModal();
        els.status.textContent = "已创建账号并切换到对应的本机工作区";
      } else {
        finishEntryChoice("account");
        setAccountNotice("注册成功，已登录。", "success");
      }
    } else {
      setPendingConfirmation(email);
      setAccountNotice("注册成功，请到邮箱点击确认链接后再登录。", "success");
      setAccountAuthMode("signin", { keepNotice: true });
    }
    els.accountPassword.value = "";
    els.accountPasswordConfirm.value = "";
  } catch (error) {
    setAccountNotice(accountAuthErrorMessage(error, "signup"), "error");
  } finally {
    setAccountBusy(false);
  }
}

async function resendAccountConfirmation() {
  const email = pendingConfirmationEmail || els.accountEmail.value.trim();
  if (!email) {
    setAccountNotice("请先输入注册时使用的邮箱。", "error");
    els.accountEmail.focus();
    return;
  }
  setAccountBusy(true);
  setAccountNotice("正在重新发送确认邮件…");
  try {
    await cloudApi().resendSignUp(email);
    localStorage.setItem(LAST_ACCOUNT_EMAIL_KEY, email);
    setPendingConfirmation(email);
    setAccountAuthMode("signin", { keepNotice: true });
    setAccountNotice("新的确认邮件已经发送。请只点击最新收到的那一封。", "success");
  } catch (error) {
    const message = String(error?.message || "").toLowerCase();
    setAccountNotice(
      message.includes("rate limit")
        ? "发送得太频繁，请稍等一会儿再试。"
        : error?.message || "确认邮件发送失败，请稍后再试。",
      "error",
    );
  } finally {
    setAccountBusy(false);
  }
}

/** Google 登录只在真的连得上 Google 时才露出来，探测结果由 cloud 层缓存。 */
async function refreshGoogleSignInVisibility() {
  if (!els.accountOauth) return;
  const api = cloudApi();
  if (!api?.configured || (cloudState.user && !accountAuthAddMode) || accountAuthMode === "reset") {
    els.accountOauth.hidden = true;
    return;
  }
  els.accountOauth.hidden = !(await api.googleSignInAvailable());
  if (api.isServiceRestricted?.()) setAccountNotice(CLOUD_RESTRICTED_NOTICE);
}

async function signInWithGoogleAccount() {
  markAccountAddPending();
  markGoogleOAuthPending();
  setAccountBusy(true);
  setAccountNotice("正在跳转到 Google…");
  try {
    // 成功的话浏览器会直接跳走，下面这行不会执行到。
    await cloudApi().signInWithGoogle();
    // 若 SDK 没有发起浏览器跳转，不能让界面永久停在“正在跳转”。
    setAccountBusy(false);
    setAccountNotice("正在跳转，完成后会回到你的工作区。");
  } catch (error) {
    takeGoogleOAuthPending();
    clearAccountAddPending();
    setAccountNotice(error?.message || "跳转 Google 登录失败，请稍后再试。", "error");
    setAccountBusy(false);
  }
}

async function requestPasswordReset() {
  const email = els.accountEmail.value.trim() || localStorage.getItem(LAST_ACCOUNT_EMAIL_KEY) || "";
  if (!email) {
    setAccountNotice("请先填写注册时使用的邮箱。", "error");
    els.accountEmail.focus();
    return;
  }
  setAccountBusy(true);
  setAccountNotice("正在发送重置邮件…");
  try {
    await cloudApi().sendPasswordReset(email);
    localStorage.setItem(LAST_ACCOUNT_EMAIL_KEY, email);
    setAccountNotice(`重置邮件已发送到 ${email}，点击邮件里的链接就能设置新密码。`, "success");
  } catch (error) {
    setAccountNotice(accountAuthErrorMessage(error, "signup"), "error");
  } finally {
    setAccountBusy(false);
  }
}

async function applyNewPassword() {
  const password = els.accountNewPassword.value;
  if (password.length < 8) {
    setAccountNotice("新密码至少 8 位。", "error");
    els.accountNewPassword.focus();
    return;
  }
  setAccountBusy(true);
  setAccountNotice("正在保存新密码…");
  try {
    await cloudApi().updatePassword(password);
    els.accountNewPassword.value = "";
    setAccountAuthMode("signin", { keepNotice: true });
    setAccountNotice("新密码已保存，下次可以直接用它登录。", "success");
  } catch (error) {
    setAccountNotice(error?.message || "密码保存失败，请重新发一次重置邮件。", "error");
  } finally {
    setAccountBusy(false);
  }
}

async function submitAccountAuth(event) {
  event.preventDefault();
  if (accountAuthMode === "reset") await applyNewPassword();
  else if (accountAuthMode === "signup") await signUpAccount();
  else await signInAccount();
}

async function signOutAccount() {
  closeAccountMenu();
  setAccountBusy(true);
  cloudState.signingOut = true;
  try {
    document.body.classList.add("entry-choice-pending");
    await cloudApi().signOutLocal();
    await handleCloudSession(null);
    clearRememberedAccountIdentity();
    await activateWorkspaceScope("guest");
    sessionStorage.removeItem(ENTRY_MODE_SESSION_KEY);
    closeAccountModal();
    showEntryChoice("已退出登录。请选择登录或游客模式继续使用。");
  } catch (error) {
    document.body.classList.remove("entry-choice-pending");
    setAccountNotice(error?.message || "退出登录失败。", "error");
  } finally {
    cloudState.signingOut = false;
    setAccountBusy(false);
  }
}

function scheduleCloudProfileSync(options = {}) {
  if (!cloudIsReady() || cloudState.loadingWorkspace) return;
  cloudState.pendingAvatarUpload ||= Boolean(options.uploadAvatar);
  window.clearTimeout(cloudState.profileTimer);
  cloudState.profileTimer = window.setTimeout(() => {
    cloudState.profileTimer = 0;
    void flushCloudProfileSync();
  }, 700);
}

async function flushCloudProfileSync() {
  if (!cloudIsReady() || cloudState.loadingWorkspace || cloudState.syncingProfile) return;
  cloudState.syncingProfile = true;
  const shouldUploadAvatar = cloudState.pendingAvatarUpload;
  cloudState.pendingAvatarUpload = false;
  try {
    let avatarUrl = cloudState.profileAvatarUrl || (String(state.avatar).startsWith("http") ? state.avatar : "");
    if (shouldUploadAvatar) {
      await updateAvatarPreview();
      const renderedAvatar = els.avatarPreview?.src || state.avatar;
      if (renderedAvatar) avatarUrl = await cloudApi().uploadAvatar(renderedAvatar);
      cloudState.profileAvatarUrl = avatarUrl;
    }
    const profile = await cloudApi().upsertProfile({
      displayName: els.displayName.value.trim() || "未命名作者",
      avatarUrl: avatarUrl || undefined,
    });
    cloudState.profileAvatarUrl = profile.avatar_url || avatarUrl || "";
    updateAccountUi();
  } catch (error) {
    console.error(error);
    cloudState.pendingAvatarUpload ||= shouldUploadAvatar;
    els.status.textContent = error?.message || "账号资料同步失败，本机资料仍已保存";
  } finally {
    cloudState.syncingProfile = false;
  }
}

async function importLocalProjectsToAccount() {
  if (!cloudState.user || !cloudState.localImportProjects.length) return;
  // 草稿改为本机保存后，导入就是并进这个账号在本机的原稿列表，不经过云端。
  // 图片缓存键只跟项目和图片编号有关，不分作用域，直接复用。
  const count = cloudState.localImportProjects.length;
  const existing = new Set(state.projects.map((project) => project.id));
  const incoming = cloudState.localImportProjects.filter((project) => !existing.has(project.id));
  state.projects = [...incoming, ...state.projects.filter((project) => !isBuiltInProject(project))]
    .sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0))
    .slice(0, MAX_PROJECTS);
  saveProjectStore();
  updateProjectHistory();
  cloudState.localImportProjects = [];
  setAccountNotice(`已把 ${count} 条游客 / 本机草稿加进这个账号的原稿列表，原数据仍然保留。`, "success");
  updateAccountUi();
}

function migrateStoredState(data) {
  const oldBoldQuote =
    "**“请你从某个领域里，选择一个研究生水平的概念。然后写一个寓言故事，用间接的方式把这个概念讲清楚。不要一开始就说答案，尽量到故事快结束的时候，才让人意识到原来讲的是这个概念。故事结束后，再解释这个概念，以及故事里的隐喻分别对应什么。”**";
  if (typeof data.content !== "string") data.content = defaultText;
  data.content = data.content.replace(
    oldBoldQuote,
    "“请你从某个领域里，选择一个研究生水平的概念。然后写一个寓言故事，用间接的方式把这个概念讲清楚。不要一开始就说答案，尽量到故事快结束的时候，才让人意识到原来讲的是这个概念。故事结束后，再解释这个概念，以及故事里的隐喻分别对应什么。”",
  );
  if (["380", "520"].includes(String(data.imageHeight))) data.imageHeight = String(CARD_MAX_IMAGE_HEIGHT);
  if (data.handle === "@heytomato") data.handle = DEFAULT_HANDLE;
  if (!Number.isFinite(Number(data.fontSize)) || Math.abs(Number(data.fontSize) - 31) < 0.001) {
    data.fontSize = String(DEFAULT_CARD_FONT_SIZE);
  }
  if (!Number.isFinite(Number(data.lineHeight)) || Math.abs(Number(data.lineHeight) - 1.65) < 0.001) {
    data.lineHeight = String(DEFAULT_CARD_LINE_HEIGHT);
  }
  delete data.underlineGap;
  data.headerMode = data.headerMode === "first" ? "first" : "every";
  data.appMode = data.appMode === "article" ? "article" : "cards";
  data.articleTheme = normalizeArticleTheme(data.articleTheme);
  data.articleCodeTheme = normalizeArticleCodeTheme(data.articleCodeTheme);
  data.articleMacCode = data.articleMacCode !== false;
  data.articleSize = normalizeArticleSize(data.articleSize);
  // 字体、主题色已并入主题 CSS
  delete data.articleFont;
  delete data.articleColor;
  data.images = normalizeImagesForContent(data.content, data.images);
  return data;
}

function defaultImages() {
  return {
    sample: {
      src: sampleImage,
      name: "sample",
    },
  };
}

function normalizeImagesForContent(content, images) {
  const nextImages = images && typeof images === "object" ? { ...images } : {};
  Object.entries(nextImages).forEach(([id, image]) => {
    if (!image || typeof image !== "object" || image.kind !== "live") return;
    nextImages[id] = {
      ...image,
      kind: "live",
      videoKey: String(image.videoKey || id),
      liveSettings: normalizeLiveMediaSettings({
        ...(image.liveSettings || {}),
        aspect: image.liveSettings?.aspect ?? "0.75",
      }),
    };
  });
  if (String(content || "").includes("[[image:sample]]") && !nextImages.sample) {
    nextImages.sample = defaultImages().sample;
  }
  return nextImages;
}

function createProject(data = defaultFormState()) {
  const normalized = migrateStoredState({ ...defaultFormState(), ...data });
  const now = Date.now();
  return {
    id: `project_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    title: projectTitleFromData(normalized),
    createdAt: now,
    updatedAt: now,
    data: normalized,
  };
}

function projectCreatedAt(project) {
  if (project?.createdAtUnknown === true) return null;
  const explicit = typeof project?.createdAt === "string" ? Date.parse(project.createdAt) : Number(project?.createdAt);
  if (Number.isFinite(explicit) && explicit >= Date.UTC(2020, 0, 1) && explicit <= Date.now() + 86400000) return explicit;
  const match = /^project_([0-9a-z]+)_[0-9a-z]{5}$/.exec(String(project?.id || ""));
  if (!match) return null;
  const inferred = Number.parseInt(match[1], 36);
  return Number.isFinite(inferred) && inferred >= Date.UTC(2020, 0, 1) && inferred <= Date.now() + 86400000
    ? inferred : null;
}

function projectFolderName(project) {
  const createdAt = projectCreatedAt(project);
  if (!createdAt) return `unknown-created_${String(project.id || "project").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40)}`;
  const date = new Date(createdAt);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

function loadProjectStore() {
  if (activeStorageScope === "guest") migrateGuestSessionStore();
  try {
    const raw = storageForScope().getItem(scopedStorageKey(PROJECTS_STORAGE_KEY));
    if (raw) {
      const parsed = JSON.parse(raw);
      const projects = Array.isArray(parsed.projects)
        ? parsed.projects.map(normalizeProject).filter(Boolean).slice(0, MAX_PROJECTS)
        : [];
      const activeId = isBuiltInProjectId(parsed.activeId)
        ? parsed.activeId
        : projects.some((project) => project.id === parsed.activeId)
          ? parsed.activeId
          : projects[0]?.id || GUIDE_CARDS_PROJECT_ID;
      return { activeId, projects };
    }

    const legacyRaw = activeStorageScope === "local" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!legacyRaw) return { activeId: GUIDE_CARDS_PROJECT_ID, projects: [] };

    const legacyData = JSON.parse(legacyRaw);
    const project = createProject(legacyData);
    return { activeId: project.id, projects: [project] };
  } catch {
    return { activeId: GUIDE_CARDS_PROJECT_ID, projects: [] };
  }
}

function normalizeProject(project) {
  if (!project || typeof project !== "object") return null;
  if (isBuiltInProjectId(project.id)) return null;
  const data = migrateStoredState({ ...defaultFormState(), ...(project.data || {}) });
  const updatedAt = Number(project.updatedAt) || Date.now();
  return {
    id: project.id || `project_${updatedAt.toString(36)}`,
    title: project.title || projectTitleFromData(data),
    createdAt: projectCreatedAt(project),
    createdAtUnknown: project.createdAtUnknown === true,
    updatedAt,
    data,
  };
}

function saveProjectStore() {
  storageForScope().setItem(
    scopedStorageKey(PROJECTS_STORAGE_KEY),
    JSON.stringify({
      activeId: state.currentProjectId,
      projects: state.projects
        .filter((project) => !isBuiltInProject(project))
        .slice(0, MAX_PROJECTS)
        .map((project) => ({ ...project, data: withExternalizedImages(project.data, project.id) })),
    }),
  );
}

function projectTitleFromData(data) {
  const customTitle = String(data.title || "").trim();
  if (customTitle) return customTitle.slice(0, 40);
  const contentLine = String(data.content || "")
    .split("\n")
    .map((line) => line.replace(/^\s*#+\s*/, "").trim())
    .find((line) => line && !line.startsWith("[[image:"));
  return (contentLine || data.displayName || "未命名图文").slice(0, 24);
}

// 标题留空时，占位文字显示正文第一行，也就是列表、页脚和文件名实际会用的标题。
function updateDraftTitlePlaceholder() {
  els.draftTitle.placeholder = projectTitleFromData({ content: els.content.value });
}

function formatProjectTime(time) {
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function projectType(project) {
  return project?.data?.appMode === "article" ? "article" : "cards";
}

function projectTypeLabel(type) {
  return type === "article" ? "长文" : "图文";
}

function updateProjectHistory() {
  if (!els.projectHistory) return;
  els.projectHistory.innerHTML = "";
  els.historyFilterButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.historyFilter === state.historyFilter);
  });

  const visibleProjects = allHistoryProjects().filter((project) => {
    if (state.historyFilter === "all") return true;
    return projectType(project) === state.historyFilter;
  });

  const folderDraftFiles = new Map(
    Object.entries(loadFolderDraftRecords()).map(([file, record]) => [record?.projectId, file]),
  );

  if (!visibleProjects.length) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = state.historyFilter === "article" ? "暂无长文原稿" : state.historyFilter === "cards" ? "暂无图文原稿" : "暂无原稿";
    els.projectHistory.append(empty);
    return;
  }

  for (const project of visibleProjects) {
    const type = projectType(project);
    const builtIn = isBuiltInProject(project);
    const item = document.createElement("div");
    item.className = "history-item";
    item.classList.toggle("built-in", builtIn);
    item.classList.toggle("active", project.id === state.currentProjectId);
    item.dataset.projectType = type;
    item.dataset.projectId = project.id;
    const folderFile = folderDraftFiles.get(project.id);
    item.innerHTML = `
      <button type="button" class="history-open"${folderFile ? ` title="载入自 drafts/${escapeHtml(folderFile)}"` : ""}>
        <span>${escapeHtml(project.title || "未命名图文")}</span>
        <small><b>${builtIn ? "说明" : projectTypeLabel(type)}</b>${folderFile ? "<em>drafts</em>" : ""}${builtIn ? projectTypeLabel(type) : formatProjectTime(project.updatedAt)}</small>
      </button>
      ${
        builtIn
          ? '<span class="history-lock" title="内置说明书不可修改"><i data-lucide="lock"></i></span>'
          : `<button type="button" class="history-delete" title="删除原稿" aria-label="删除 ${escapeHtml(project.title || "未命名图文")}">
              <i data-lucide="trash-2"></i>
            </button>`
      }
    `;
    item.querySelector(".history-open").addEventListener("click", () => openProject(project.id));
    item.querySelector(".history-delete")?.addEventListener("click", () => deleteProject(project.id));
    els.projectHistory.append(item);
  }
  if (window.lucide) window.lucide.createIcons();
}

function setHistoryFilter(filter) {
  state.historyFilter = ["all", "cards", "article"].includes(filter) ? filter : "all";
  updateProjectHistory();
}

function setHistoryOpen(open) {
  if (!els.historySidebar) return;
  els.historySidebar.classList.toggle("open", open);
  els.workspace?.classList.toggle("history-open", open);
  els.historyToggle?.setAttribute("aria-label", open ? "收起原稿列表" : "打开原稿列表");
  els.historyToggle?.setAttribute("title", open ? "收起原稿列表" : "打开原稿列表");
}

function toggleHistory() {
  setHistoryOpen(!els.historySidebar?.classList.contains("open"));
}

async function openProject(projectId) {
  if (!projectId || projectId === state.currentProjectId) return;
  saveState();
  const project = findHistoryProject(projectId);
  if (!project) return;
  // 后台预载可能还没轮到这个项目：打开前把缺的云端素材补齐（幂等，已就绪时立即返回）
  if (cloudIsReady() && !isBuiltInProject(project)) {
    await hydrateCloudProjectOnce(project).catch(() => undefined);
  }
  state.currentProjectId = project.id;
  applyForm(project.data);
  syncGuideReadOnlyMode();
  if (isBuiltInProject(project)) saveProjectStore();
  resetTextHistory();
  updateProjectHistory();
  await render();
  els.status.textContent = isBuiltInProject(project) ? `已打开内置说明书：${project.title}` : `已打开：${project.title || "未命名图文"}`;
}

async function deleteProject(projectId) {
  if (isBuiltInProjectId(projectId)) {
    els.status.textContent = "内置说明书不可删除";
    return;
  }
  const project = state.projects.find((item) => item.id === projectId);
  if (!project) return;
  const liveKeys = Object.entries(project.data?.images || {})
    .filter(([, image]) => image?.kind === "live")
    .map(([id, image]) => String(image.videoKey || id));
  await Promise.all(
    liveKeys.map(async (key) => {
      const cached = liveMediaFiles.get(key);
      if (cached?.url) URL.revokeObjectURL(cached.url);
      liveMediaFiles.delete(key);
      try {
        await deleteLiveMediaBlob(key);
      } catch {
        // The project can still be deleted when browser media cleanup is unavailable.
      }
    }),
  );
  const deletingCurrent = project.id === state.currentProjectId;
  state.projects = state.projects.filter((item) => item.id !== project.id);

  if (!state.projects.length) {
    const guideProject = findHistoryProject(GUIDE_CARDS_PROJECT_ID);
    state.currentProjectId = GUIDE_CARDS_PROJECT_ID;
    applyForm(guideProject?.data || defaultFormState());
    syncGuideReadOnlyMode();
    resetTextHistory();
    saveProjectStore();
    updateProjectHistory();
    await render();
    els.status.textContent = "已删除全部草稿，已回到图文卡片说明书";
    return;
  }

  if (deletingCurrent) {
    const nextProject = state.projects[0];
    state.currentProjectId = nextProject.id;
    applyForm(nextProject.data);
    syncGuideReadOnlyMode();
    resetTextHistory();
    saveProjectStore();
    updateProjectHistory();
    await render();
    els.status.textContent = `已删除并打开：${nextProject.title || "未命名图文"}`;
    return;
  }

  saveProjectStore();
  updateProjectHistory();
  els.status.textContent = `已删除：${project.title || "未命名图文"}`;
}

async function createNewProject() {
  saveState();
  const project = createProject(blankFormState());
  state.projects = [project, ...state.projects.filter((item) => item.id !== project.id)].slice(0, MAX_PROJECTS);
  state.currentProjectId = project.id;
  applyForm(project.data);
  syncGuideReadOnlyMode();
  resetTextHistory();
  updateProjectHistory();
  await render();
  els.status.textContent = "已新建图文，上一篇可在左侧原稿列表切换";
}

// 本机 server.py 会列出仓库 drafts/ 里的 Markdown；线上静态站没有这个接口，直接跳过。
// 网页里改动副本后会自动写回原文件；两边都改过时先问用户保留哪一边。
const FOLDER_DRAFTS_STORAGE_KEY = "writeThenPublishFolderDrafts.v1";
const FOLDER_DRAFT_WRITE_DELAY = 1200;
const folderDraftSync = { running: null, again: false, announceAgain: false, generation: 0 };
const folderDraftWrites = { timers: new Map(), running: new Map(), notes: new Map() };
// drafts/ 下按类型分两个文件夹，草稿文件是 "图文/<文件夹>/<草稿>.md"。
const FOLDER_DRAFT_TYPE_DIRS = { cards: "图文", article: "长文" };

function folderDraftType(file) {
  return String(file || "").split("/")[0] === FOLDER_DRAFT_TYPE_DIRS.article ? "article" : "cards";
}

function folderDraftsSupported() {
  return window.location.protocol.startsWith("http")
    && ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
}

/** 记录每个文件载入时的 mtime、副本 id 和指纹：{ [file]: { mtime, projectId, fingerprint } } */
function loadFolderDraftRecords() {
  try {
    const parsed = JSON.parse(storageForScope().getItem(scopedStorageKey(FOLDER_DRAFTS_STORAGE_KEY)) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function saveFolderDraftRecords(records) {
  storageForScope().setItem(scopedStorageKey(FOLDER_DRAFTS_STORAGE_KEY), JSON.stringify(records));
}

function folderDraftFingerprint(title, content) {
  const text = `${String(title || "").trim()}\n${String(content || "")}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${text.length}:${(hash >>> 0).toString(36)}`;
}

/** 副本自载入后没被改过（标题和正文都没动）才允许用新文件覆盖。 */
function folderDraftUntouched(project, record) {
  const current = project.id === state.currentProjectId
    ? { title: els.draftTitle.value, content: els.content.value }
    : project.data;
  return folderDraftFingerprint(current.title, current.content) === record.fingerprint;
}

function folderDraftAssetPaths(reference) {
  let path = String(reference || "").trim().replace(/^<|>$/g, "");
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith("/")) return [];
  try {
    path = decodeURIComponent(path);
  } catch {
    // Keep the original text when the reference contains an incomplete escape sequence.
  }
  const parts = path.replace(/\\/g, "/").replace(/[?#].*$/, "").split("/").filter((part) => part && part !== ".");
  if (!parts.length || parts.includes("..")) return [];
  const relative = parts.join("/");
  // Obsidian 的 ![[x.png]] 只写文件名，再到 assets/ 里找一次。
  return parts.length === 1 ? [relative, `assets/${relative}`] : [relative];
}

/** 草稿文件是 "类型/文件夹/草稿.md"；正文里的图片路径相对这个文件夹。 */
function folderDraftUrl(file, relative) {
  const folder = String(file || "").split("/").slice(0, -1);
  return `drafts/${[...folder, ...relative.split("/")].map(encodeURIComponent).join("/")}`;
}

/** 每个图片引用在原文里第一次出现的写法，写回时原样还原。 */
function folderDraftEmbeds(markdown) {
  const embeds = new Map();
  const text = String(markdown || "");
  for (const match of text.matchAll(/!\[\[([^\]\n]+)\]\]/g)) {
    const reference = match[1].split("|")[0].trim();
    if (!embeds.has(reference)) embeds.set(reference, match[0]);
  }
  for (const match of text.matchAll(/!\[[^\]\n]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+[^)]*)?\)/g)) {
    const reference = (match[1] || match[2] || "").trim();
    if (!embeds.has(reference)) embeds.set(reference, match[0]);
  }
  return embeds;
}

/** 图片引用里的文件路径；实况图写成 ![名](assets/x.jpg "live:assets/x.mov")，标题里是视频。 */
function folderDraftEmbedParts(embed) {
  const text = String(embed || "");
  const wiki = /^!\[\[([^\]\n]+)\]\]$/.exec(text);
  if (wiki) return { reference: wiki[1].split("|")[0].trim(), video: "" };
  const match = /^!\[[^\]\n]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+"live:([^"\n]+)")?[^)]*\)$/.exec(text);
  return match ? { reference: (match[1] || match[2] || "").trim(), video: (match[3] || "").trim() } : { reference: "", video: "" };
}

async function fetchFolderDraftAsset(file, reference, pattern, kind) {
  for (const relative of folderDraftAssetPaths(reference)) {
    try {
      const response = await fetch(folderDraftUrl(file, relative), { cache: "no-store" });
      if (!response.ok) continue;
      const blob = await response.blob();
      if (blob.type.startsWith(`${kind}/`)) return { blob, relative };
      // 本机服务认不出的格式（比如 HEIC）按扩展名收下。
      if (pattern.test(relative)) {
        const extension = relative.split(".").pop().toLowerCase();
        const type = kind === "video" ? { mp4: "video/mp4", m4v: "video/mp4", webm: "video/webm" }[extension] || "video/quicktime" : "";
        return { blob: new Blob([blob], { type }), relative };
      }
    } catch {
      // 读不到就试下一个候选路径。
    }
  }
  return null;
}

async function loadFolderDraftImages(markdown, file, previous = {}) {
  const images = {};
  const embeds = folderDraftEmbeds(markdown);
  for (const [index, reference] of extractMarkdownImageReferences(markdown).entries()) {
    // 单张图读不到时保留原 Markdown 引用，不影响其余内容。
    const cover = await fetchFolderDraftAsset(file, reference, /\.(avif|bmp|gif|heic|heif|jpe?g|png|svg|webp)$/i, "image");
    if (!cover) continue;
    const sourcePath = folderDraftAssetPaths(reference)[0];
    const draftEmbed = embeds.get(reference) || `![](${cover.relative})`;
    const id = createImportedImageId(index);
    images[id] = {
      src: await readFileAsDataURL(cover.blob),
      name: sourcePath.split("/").pop(),
      sourcePath,
      vaultPath: null,
      crop: null,
      layout: defaultNewImageLayout(),
      draftEmbed,
    };
    const { video: videoReference } = folderDraftEmbedParts(draftEmbed);
    const video = videoReference ? await fetchFolderDraftAsset(file, videoReference, /\.(mov|mp4|m4v|webm)$/i, "video") : null;
    if (!video) continue;
    // 文件刷新后沿用上一版的视频存储位置和实况参数（时长、速度、裁剪等 Markdown 里没写）。
    const [priorId, prior] = Object.entries(previous).find(([, image]) => image?.kind === "live" && image.draftEmbed === draftEmbed) || [];
    const videoKey = String(prior?.videoKey || priorId || id);
    const videoName = video.relative.split("/").pop();
    try {
      await writeLiveMediaBlob(videoKey, video.blob);
    } catch {
      continue;
    }
    replaceLiveMediaCache(videoKey, video.blob, videoName);
    Object.assign(images[id], {
      kind: "live",
      videoKey,
      videoName,
      videoType: video.blob.type || "video/quicktime",
      videoDuration: Number(prior?.videoDuration) || 0,
      videoWidth: Number(prior?.videoWidth) || 0,
      videoHeight: Number(prior?.videoHeight) || 0,
      liveSettings: normalizeLiveMediaSettings(prior?.liveSettings || {}),
    });
  }
  return images;
}

async function syncFolderDrafts({ announce = false } = {}) {
  if (!folderDraftsSupported()) return;
  if (folderDraftSync.running) {
    folderDraftSync.again = true;
    // 自动同步还没跑完时点了“重新载入”，补跑的那次按手动处理。
    folderDraftSync.announceAgain ||= announce;
    return folderDraftSync.running;
  }
  folderDraftSync.running = runFolderDraftSync(announce).finally(() => {
    folderDraftSync.running = null;
    if (folderDraftSync.again) {
      const announceAgain = folderDraftSync.announceAgain;
      folderDraftSync.again = false;
      folderDraftSync.announceAgain = false;
      void syncFolderDrafts({ announce: announceAgain });
    }
  });
  return folderDraftSync.running;
}

async function runFolderDraftSync(announce) {
  let payload;
  try {
    const response = await fetch("api/drafts", { cache: "no-store" });
    if (!response.ok) return;
    payload = await response.json();
  } catch {
    return;
  }
  if (els.syncFolderDrafts) els.syncFolderDrafts.hidden = false;
  // 能读到 drafts/ 说明是本机 server.py，才显示“保存到项目”。
  if (els.saveToProject) els.saveToProject.hidden = false;
  const generation = folderDraftSync.generation;
  const stale = () => generation !== folderDraftSync.generation || cloudState.loadingWorkspace;
  // 工作区正在切换时不动它；activateWorkspaceScope 结束后会再同步一次。
  if (stale()) return;

  const drafts = Array.isArray(payload?.drafts) ? payload.drafts : [];
  const records = loadFolderDraftRecords();
  let added = 0;
  let refreshed = 0;
  let full = 0;
  let refreshedCurrent = false;
  let movedRecords = false;
  for (const draft of drafts) {
    const file = String(draft?.file || "");
    const mtime = Number(draft?.mtime) || 0;
    const type = draft?.type === "article" ? "article" : "cards";
    // 草稿从 drafts/x.md、drafts/x/x.md 挪进 drafts/图文/x/x.md 后，沿用原来的副本，不重复载入。
    const inner = file.split("/").slice(1).join("/");
    const legacyKey = [inner, inner.split("/").pop(), `${inner.split("/")[0]}.md`].find((key) => key && key !== file && records[key]);
    if (!records[file] && legacyKey) {
      records[file] = records[legacyKey];
      delete records[legacyKey];
      movedRecords = true;
    }
    const record = records[file];
    const existing = record ? state.projects.find((project) => project.id === record.projectId) : null;
    // 网页里删掉的副本：刷新网页或点“重新载入”时按文件重新载入一份，要彻底删掉得删 drafts/ 里的文件夹。
    if (!file || (record && mtime <= record.mtime && existing)) continue;
    if (existing && !folderDraftUntouched(existing, record)) continue;
    if (!existing && state.projects.length >= MAX_PROJECTS) {
      full += 1;
      continue;
    }

    // textarea 会把 CRLF 读成 LF，先统一，否则指纹永远对不上。
    const markdown = String(draft.content || "").replace(/\r\n?/g, "\n");
    const images = await loadFolderDraftImages(markdown, file, existing?.data?.images);
    if (stale()) return;
    const title = String(draft.title || "").trim().slice(0, 200);
    const content = convertObsidianImageReferences(markdown, images).content;
    // 图片读取期间用户可能已经开始改这份副本，落盘前再确认一次。
    const project = existing && state.projects.includes(existing) && folderDraftUntouched(existing, record) ? existing : null;
    if (existing && !project) continue;
    if (project) {
      const keptVideos = new Set(Object.values(images).map((image) => image.videoKey).filter(Boolean));
      for (const [id, image] of Object.entries(project.data.images || {})) {
        if (image?.kind === "live" && !keptVideos.has(String(image.videoKey || id))) void cleanUpDeletedImageAsset(id, image);
      }
      project.data = { ...project.data, appMode: type, title, content, images };
      project.title = projectTitleFromData(project.data);
      project.updatedAt = Date.now();
      refreshed += 1;
      // 正在打开的这篇立刻换进编辑器，免得后面读图期间的自动保存把旧内容写回去。
      if (project.id === state.currentProjectId) {
        applyForm(project.data);
        resetTextHistory();
        refreshedCurrent = true;
      }
    } else {
      const created = createProject({ ...blankFormState(), appMode: type, title, content, images });
      state.projects = [created, ...state.projects];
      records[file] = { projectId: created.id };
      added += 1;
    }
    records[file] = { ...records[file], mtime, fingerprint: folderDraftFingerprint(title, content) };
  }

  if (movedRecords && !added && !refreshed) saveFolderDraftRecords(records);
  if (added || refreshed) {
    saveProjectStore();
    saveFolderDraftRecords(records);
    updateProjectHistory();
    if (refreshedCurrent) await render();
  }
  const parts = [];
  if (added) parts.push(`新载入 ${added} 篇`);
  if (refreshed) parts.push(`更新 ${refreshed} 篇`);
  if (full) parts.push(`${full} 篇因原稿已满 ${MAX_PROJECTS} 篇未载入`);
  if (parts.length) els.status.textContent = `项目 drafts/ 文件夹：${parts.join("，")}`;
  else if (announce) els.status.textContent = "项目 drafts/ 文件夹没有新的或更新过的草稿";
}

function folderDraftFileForProject(projectId, records = loadFolderDraftRecords()) {
  return Object.keys(records).find((file) => records[file]?.projectId === projectId) || null;
}

function scheduleFolderDraftWriteBack(projectId) {
  if (!folderDraftsSupported() || cloudState.loadingWorkspace) return;
  if (!folderDraftFileForProject(projectId)) return;
  window.clearTimeout(folderDraftWrites.timers.get(projectId));
  folderDraftWrites.timers.set(projectId, window.setTimeout(() => {
    folderDraftWrites.timers.delete(projectId);
    void writeBackFolderDraft(projectId);
  }, FOLDER_DRAFT_WRITE_DELAY));
}

async function folderDraftImageDataURL(image) {
  let src = image?.src || "";
  if (!src && image?.srcKey) src = (await readImageSource(image.srcKey).catch(() => null)) || "";
  if (!src) return "";
  if (src.startsWith("data:")) return src;
  const response = await fetch(src);
  if (!response.ok) return "";
  return readFileAsDataURL(await response.blob());
}

/** 早先载入的副本没记 draftEmbed：sourcePath 能在 drafts/ 里找到同一文件时直接引用它，不再重复存图。 */
async function existingFolderDraftEmbed(image, file) {
  if (!file || !image?.sourcePath || image.vaultPath || image.kind === "live") return "";
  // 同名但内容不同的图（比如粘贴的 image.png）不能误引用，用字节数再核对一次。
  const src = await folderDraftImageDataURL(image).catch(() => "");
  const base64 = src.split(",")[1] || "";
  const bytes = Math.floor((base64.length * 3) / 4) - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
  if (!bytes) return "";
  for (const relative of folderDraftAssetPaths(image.sourcePath)) {
    try {
      const response = await fetch(folderDraftUrl(file, relative), { method: "HEAD", cache: "no-store" });
      if (response.ok && Number(response.headers.get("Content-Length")) === bytes) {
        image.draftEmbed = `![](${relative})`;
        return image.draftEmbed;
      }
    } catch {
      // 查不到就按新图处理。
    }
  }
  return "";
}

/** 引用到的图片（和实况视频）是否都还在草稿文件夹里。 */
async function folderDraftEmbedFilesExist(embed, file) {
  const { reference, video } = folderDraftEmbedParts(embed);
  if (!reference) return false;
  for (const target of [reference, video].filter(Boolean)) {
    let found = false;
    for (const relative of folderDraftAssetPaths(target)) {
      try {
        found = (await fetch(folderDraftUrl(file, relative), { method: "HEAD", cache: "no-store" })).ok;
      } catch {
        found = false;
      }
      if (found) break;
    }
    if (!found) return false;
  }
  return true;
}

/** 一张图要写进 assets/ 的文件：原图或 GIF 原样保存；实况图再加一份原视频。 */
async function folderDraftUpload(id, image) {
  const cover = await portableCoverBlob(image);
  const base = safeObsidianFileName(String(image.name || "图片").replace(/\.[^.]+$/, ""), "图片")
    .replace(/[\s()[\]<>]+/g, "-")
    .replace(/^\.+/, "") || "图片";
  const stem = `assets/${base}-${id.replace(/[^a-z0-9_-]/gi, "").slice(-8) || "image"}`;
  const coverExtension = portableMediaExtension(cover, image.name);
  const path = `${stem}${coverExtension === "bin" ? imageExtensionFromSource(image, cover) : `.${coverExtension}`}`;
  const files = [{ path, blob: cover }];
  if (image.kind !== "live") return { id, path, embed: `![${base}](${path})`, files };
  const video = await portableVideoBlob(image, id);
  const videoExtension = portableMediaExtension(video, image.videoName, true);
  const videoPath = `${stem}.${videoExtension === "bin" ? "mov" : videoExtension}`;
  files.push({ path: videoPath, blob: video });
  return { id, path, embed: `![${base}](${path} "live:${videoPath}")`, files };
}

/** 素材逐个原样写进 drafts/<文件夹>/assets/；视频可能很大，不放进 JSON。 */
async function uploadFolderDraftFiles(file, uploads) {
  const done = [];
  const failed = [];
  for (const upload of uploads) {
    let ok = true;
    for (const { path, blob } of upload.files) {
      try {
        const response = await fetch(`api/drafts/asset?${new URLSearchParams({ file, path })}`, {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: blob,
        });
        const result = await response.json().catch(() => ({}));
        if (response.status === 404 && result.missing) return { missing: true, done, failed };
        if (!response.ok || !result.ok) throw new Error(result.error || `HTTP ${response.status}`);
      } catch (error) {
        ok = false;
        failed.push(`${path}（${error?.message || "写入失败"}）`);
        break;
      }
    }
    if (ok) done.push(upload);
  }
  return { missing: false, done, failed };
}

/**
 * 把编辑器里的 [[image:id]] 换回 Markdown 图片；网页里新加的图片、GIF、实况视频列进 uploads，
 * 由调用方写进 drafts/<文件夹>/assets/。
 * fresh：新建的草稿文件夹是空的，全部重新存；verify：已引用的文件被删掉时重新存。
 */
async function buildFolderDraftMarkdown(data, file = null, { fresh = false, verify = false } = {}) {
  const images = data.images || {};
  const uploads = [];
  const missing = [];
  const embeds = new Map();
  const embedFor = async (id) => {
    if (embeds.has(id)) return;
    const image = images[id];
    let embed = fresh ? "" : image?.draftEmbed || (await existingFolderDraftEmbed(image, file));
    if (embed && verify && file && !(await folderDraftEmbedFilesExist(embed, file))) embed = "";
    if (image && !embed) {
      try {
        const upload = await folderDraftUpload(id, image);
        uploads.push(upload);
        embed = upload.embed;
      } catch {
        missing.push(image.name || id);
      }
    }
    embeds.set(id, embed || `<!-- 缺失图片：${id} -->`);
  };
  const content = String(data.content || "");
  const markers = Array.from(content.matchAll(/\[\[image:([^\]\n]+)\]\]/g));
  for (const match of markers) {
    // 双图并排在 Markdown 里没有对应写法，写回成上下两张。
    for (const id of match[1].split("|").filter((part) => images[part])) await embedFor(id);
  }
  const markdown = content.replace(/\[\[image:([^\]\n]+)\]\]/g, (whole, inner) => {
    const ids = inner.split("|").filter((part) => images[part]);
    return ids.length ? ids.map((id) => embeds.get(id)).join("\n\n") : embeds.get(inner) || whole;
  });
  return { markdown, uploads, missing };
}

function folderDraftIssues(missing, failed) {
  const issues = [];
  if (missing.length) issues.push(`原件缺失：${missing.join("、")}`);
  if (failed.length) issues.push(`素材未写入：${failed.join("、")}`);
  return issues.join("；");
}

/** 结果："written" | "unchanged" | "missing" | "conflict" | "error" */
async function writeBackFolderDraft(projectId, { force = false, always = false } = {}) {
  if (folderDraftWrites.running.has(projectId)) {
    await folderDraftWrites.running.get(projectId);
  }
  const task = runFolderDraftWriteBack(projectId, force, always).finally(() => folderDraftWrites.running.delete(projectId));
  folderDraftWrites.running.set(projectId, task);
  return task;
}

async function runFolderDraftWriteBack(projectId, force, always = false) {
  if (folderDraftSync.running) await folderDraftSync.running;
  const records = loadFolderDraftRecords();
  const file = folderDraftFileForProject(projectId, records);
  const project = state.projects.find((item) => item.id === projectId);
  if (!file || !project) return "error";
  const record = records[file];
  const fingerprint = folderDraftFingerprint(project.data.title, project.data.content);
  // 正文没变但有图还没存进 assets/（比如刚改过的实况图）时也要写一次。
  const pendingMedia = Array.from(String(project.data.content || "").matchAll(/\[\[image:([^\]\n]+)\]\]/g))
    .flatMap((match) => match[1].split("|"))
    .some((id) => project.data.images?.[id] && !project.data.images[id].draftEmbed);
  if (!force && !always && !pendingMedia && fingerprint === record.fingerprint) return "unchanged";

  let response;
  let result;
  folderDraftWrites.notes.delete(projectId);
  // 先存素材再写 .md，正文里不会出现还没写进去的文件。
  const { markdown, uploads, missing } = await buildFolderDraftMarkdown(project.data, file, { verify: always });
  const stored = await uploadFolderDraftFiles(file, uploads);
  applyFolderDraftUploads(project, stored.done);
  if (stored.missing) {
    els.status.textContent = `drafts/${file} 已不存在，未写回`;
    return "missing";
  }
  if (stored.failed.length) {
    const note = folderDraftIssues([], stored.failed);
    folderDraftWrites.notes.set(projectId, note);
    els.status.textContent = `drafts/${file} 未写回：${note}`;
    return "error";
  }
  try {
    response = await fetch("api/drafts/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file,
        title: project.data.title || "",
        content: markdown,
        baseMtime: record.mtime,
        force,
      }),
    });
    result = await response.json().catch(() => ({}));
  } catch {
    els.status.textContent = `没连上本机服务，drafts/${file} 未写回`;
    return "error";
  }

  if (response.status === 409 && result.conflict) {
    const overwrite = window.confirm(
      `drafts/${file} 在网页载入后也被修改过。\n\n确定：用网页里的内容覆盖文件。\n取消：保留文件，网页副本改为文件里的内容。`,
    );
    if (overwrite) {
      return runFolderDraftWriteBack(projectId, true, always);
    } else {
      // 把副本当成“未改动”，再同步一次就会换成文件里的新内容。
      const latest = loadFolderDraftRecords();
      latest[file] = { ...latest[file], fingerprint: folderDraftFingerprint(project.data.title, project.data.content) };
      saveFolderDraftRecords(latest);
      await syncFolderDrafts();
    }
    return "conflict";
  }
  if (response.status === 404 && result.missing) {
    els.status.textContent = `drafts/${file} 已不存在，未写回`;
    return "missing";
  }
  if (!response.ok || !result.ok) {
    els.status.textContent = `drafts/${file} 未写回：${result.error || `HTTP ${response.status}`}`;
    return "error";
  }

  const latest = loadFolderDraftRecords();
  latest[file] = { ...latest[file], projectId, mtime: Number(result.mtime) || record.mtime, fingerprint };
  saveFolderDraftRecords(latest);
  const note = folderDraftIssues(missing, []);
  if (note) folderDraftWrites.notes.set(projectId, note);
  els.status.textContent = `已写回 drafts/${file}${note ? `；${note}` : ""}`;
  return "written";
}

// 新写出的图片记下路径，下次写回直接引用，不再重复上传。
function applyFolderDraftUploads(project, uploads) {
  for (const { id, path, embed } of uploads) {
    const written = { sourcePath: path, draftEmbed: embed };
    if (project.data.images?.[id]) Object.assign(project.data.images[id], written);
    if (project.id === state.currentProjectId && state.images[id]) Object.assign(state.images[id], written);
  }
  if (uploads.length) saveProjectStore();
}

/**
 * 稿件类型和关联的草稿文件夹不一致时（转图文 / 转长文之后），把整个草稿文件夹移到对应类型下，
 * 关联跟着改到新位置，原位置不再保留。
 * 不需要移动时返回 null，否则返回 { file, from } 或 { error }。
 */
async function moveFolderDraftToProjectType(project) {
  if (!folderDraftsSupported() || !project || isBuiltInProject(project)) return null;
  const file = folderDraftFileForProject(project.id);
  const type = projectType(project);
  if (!file || folderDraftType(file) === type) return null;
  // 先把还没写回的改动落盘，移过去的才是最新内容。
  window.clearTimeout(folderDraftWrites.timers.get(project.id));
  folderDraftWrites.timers.delete(project.id);
  const outcome = await writeBackFolderDraft(project.id);
  if (outcome === "missing") {
    // 原文件夹已被删掉：解除关联，“保存到项目”时会在新类型下重新建一个。
    const records = loadFolderDraftRecords();
    delete records[file];
    saveFolderDraftRecords(records);
    updateProjectHistory();
    return { error: `drafts/${file} 已不存在，可点“保存到项目”重新保存` };
  }
  if (outcome === "conflict") return { error: `drafts/${file} 两边都改过，请处理后再点“保存到项目”` };
  if (outcome === "error") return { error: folderDraftWrites.notes.get(project.id) || "本机服务没有确认写入" };

  let response;
  let result;
  try {
    response = await fetch("api/drafts/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file, type }),
    });
    result = await response.json().catch(() => ({}));
  } catch {
    return { error: "没连上本机服务" };
  }
  if (!response.ok || !result.ok || !result.file) return { error: result.error || `HTTP ${response.status}` };

  const records = loadFolderDraftRecords();
  const record = records[file] || {};
  delete records[file];
  records[result.file] = {
    projectId: project.id,
    mtime: Number(result.mtime) || record.mtime || Date.now(),
    fingerprint: record.fingerprint || folderDraftFingerprint(project.data.title, project.data.content),
  };
  saveFolderDraftRecords(records);
  updateProjectHistory();
  return { file: result.file, from: file };
}

/**
 * 保存到项目：确认 drafts/<图文|长文>/ 里有这一篇。已关联的立即写回一次（类型变了先移到对应文件夹），
 * 没关联或文件已被删掉的在当前类型下新建一个 .md 并关联上。线上或本机服务不在时返回 null。
 */
async function ensureFolderDraftForProject(project) {
  if (!folderDraftsSupported() || !project || isBuiltInProject(project)) return null;
  window.clearTimeout(folderDraftWrites.timers.get(project.id));
  folderDraftWrites.timers.delete(project.id);
  const moved = await moveFolderDraftToProjectType(project);
  if (moved?.error && folderDraftFileForProject(project.id)) return { error: moved.error };
  const linked = folderDraftFileForProject(project.id);
  if (linked) {
    const outcome = await writeBackFolderDraft(project.id, { always: true });
    const note = folderDraftWrites.notes.get(project.id) || "";
    if (outcome === "written" || outcome === "conflict") return { file: linked, created: false, note };
    if (outcome !== "missing") return { error: note || "本机服务没有确认写入" };
    const records = loadFolderDraftRecords();
    delete records[linked];
    saveFolderDraftRecords(records);
  }

  const { markdown, uploads, missing } = await buildFolderDraftMarkdown(project.data, null, { fresh: true });
  let response;
  let result;
  try {
    response = await fetch("api/drafts/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        create: true,
        type: projectType(project),
        title: project.data.title || "",
        fallbackName: project.title || "",
        content: markdown,
      }),
    });
    result = await response.json().catch(() => ({}));
  } catch {
    return null;
  }
  // 不是本项目的 server.py（比如别的静态服务）时没有这个接口，安静跳过。
  if (response.status === 404 && !result.missing) return null;
  if (!response.ok || !result.ok || !result.file) return { error: result.error || `HTTP ${response.status}` };

  // 文件夹建好后再把图片、GIF、实况视频写进它的 assets/。
  const stored = await uploadFolderDraftFiles(result.file, uploads);
  applyFolderDraftUploads(project, stored.done);
  const records = loadFolderDraftRecords();
  records[result.file] = {
    projectId: project.id,
    mtime: Number(result.mtime) || Date.now(),
    fingerprint: folderDraftFingerprint(project.data.title, project.data.content),
  };
  saveFolderDraftRecords(records);
  if (els.syncFolderDrafts) els.syncFolderDrafts.hidden = false;
  updateProjectHistory();
  return { file: result.file, created: true, note: folderDraftIssues(missing, stored.failed) };
}

const FIRST_RUN_ONBOARDING_STEPS = [
  {
    target: "#newProjectBtn",
    title: "先创建自己的内容",
    body: "左侧两个内容是示例模板。点击这里，新建你的图文卡片或公众号长文。",
  },
  {
    target: "#appModeSwitch",
    title: "选择发布形式",
    body: "点“图文卡片”或“长文”打开该类型最近编辑的原稿；要把当前内容转成另一种形式，点“转图文 / 转长文”。",
  },
  {
    target: "#obsidianImportMenu",
    title: "连接并同步 Obsidian",
    body: "点击这里选择仓库。粘贴笔记时会自动读取图片；修改完成后还能同步回 Obsidian，无法直写时会下载 ZIP。",
  },
  {
    target: ".preview-topbar",
    title: "边写边预览，完成后导出",
    body: "在左侧编辑内容，右侧会实时生成效果。完成后点击这里下载图片或发布包。",
  },
];

const WHATS_NEW_ONBOARDING_STEPS = [
  {
    target: "#accountBtn",
    title: "账户同步",
    body: () => cloudState.user
      ? "你已经登录。头像和昵称会跟着账号同步；请下载 ZIP 保留原稿，以后可从左上角导入。"
      : "登录后可同步头像和昵称。需要保留原稿时，请下载 ZIP；以后可重新导入编辑。",
    actionLabel: () => cloudState.user ? "查看账号资料" : "登录 / 注册",
    action: () => {
      if (cloudState.user) {
        openAccountMenu();
        return;
      }
      finishOnboarding({ remember: false });
      openAccountModal();
    },
  },
  {
    target: "#livePhotoToolbarBtn",
    title: "实况图片",
    body: "从这里选择视频、裁剪画面并插入图文。导出时会自动识别实况页，单张和批量都按对应格式处理。",
  },
  {
    target: ".preview-image-box",
    fallbackTarget: "#previewPanel",
    title: "拖动图片调整位置",
    body: "直接按住右侧预览中的图片，拖到蓝色落点线后松手。图片会移动到对应段落，左侧 Markdown 顺序也会同步更新。",
  },
  {
    target: "#obsidianImportMenu",
    title: "连接 Obsidian",
    body: "连接仓库后，可以读取笔记里的图片并同步修改后的 Markdown。暂不连接也不会影响普通编辑。",
  },
];

function onboardingSteps() {
  return onboardingMode === "whats-new" ? WHATS_NEW_ONBOARDING_STEPS : FIRST_RUN_ONBOARDING_STEPS;
}

function onboardingIsOpen() {
  return Boolean(els.onboardingTour && !els.onboardingTour.classList.contains("hidden"));
}

function onboardingShouldStart() {
  try {
    return firstRunTourIsForced() || (!state.projects.length && localStorage.getItem(ONBOARDING_STORAGE_KEY) !== "completed");
  } catch {
    return !state.projects.length;
  }
}

function positionOnboardingStep() {
  if (!onboardingIsOpen()) return;
  const step = onboardingSteps()[onboardingStepIndex];
  const target = step
    ? document.querySelector(step.target) || (step.fallbackTarget ? document.querySelector(step.fallbackTarget) : null)
    : null;
  if (!target) return;
  const rect = target.getBoundingClientRect();
  const padding = 7;
  els.onboardingFocus.style.left = `${Math.max(4, rect.left - padding)}px`;
  els.onboardingFocus.style.top = `${Math.max(4, rect.top - padding)}px`;
  els.onboardingFocus.style.width = `${Math.min(window.innerWidth - 8, rect.width + padding * 2)}px`;
  els.onboardingFocus.style.height = `${Math.min(window.innerHeight - 8, rect.height + padding * 2)}px`;

  const tooltipRect = els.onboardingTooltip.getBoundingClientRect();
  const gap = 18;
  let placement = "bottom";
  let top = rect.bottom + gap;
  if (top + tooltipRect.height > window.innerHeight - 16) {
    placement = "top";
    top = rect.top - tooltipRect.height - gap;
  }
  top = clamp(top, 16, Math.max(16, window.innerHeight - tooltipRect.height - 16));
  const left = clamp(rect.left, 16, Math.max(16, window.innerWidth - tooltipRect.width - 16));
  els.onboardingTooltip.dataset.placement = placement;
  els.onboardingTooltip.style.left = `${left}px`;
  els.onboardingTooltip.style.top = `${top}px`;
  const arrow = els.onboardingTooltip.querySelector(".onboarding-arrow");
  if (arrow) arrow.style.left = `${clamp(rect.left + rect.width / 2 - left - 6, 18, tooltipRect.width - 30)}px`;
}

function showOnboardingStep(index) {
  const steps = onboardingSteps();
  onboardingStepIndex = clamp(index, 0, steps.length - 1);
  const step = steps[onboardingStepIndex];
  closeAccountMenu();
  document.body.classList.toggle("onboarding-account-step", onboardingMode === "whats-new" && step.target === "#accountBtn");
  els.onboardingTitle.textContent = step.title;
  els.onboardingBody.textContent = typeof step.body === "function" ? step.body() : step.body;
  els.onboardingProgress.textContent = `${onboardingStepIndex + 1} / ${steps.length}`;
  els.onboardingNext.textContent = onboardingStepIndex === steps.length - 1
    ? onboardingMode === "whats-new" ? "完成" : "开始使用"
    : "下一步";
  if (els.onboardingAction) {
    const actionLabel = typeof step.actionLabel === "function" ? step.actionLabel() : step.actionLabel;
    els.onboardingAction.hidden = !actionLabel;
    els.onboardingAction.textContent = actionLabel || "";
    els.onboardingAction.onclick = actionLabel && step.action ? step.action : null;
  }
  els.onboardingTour.classList.remove("hidden");
  window.requestAnimationFrame(positionOnboardingStep);
}

function finishOnboarding({ remember = true } = {}) {
  els.onboardingTour.classList.add("hidden");
  document.body.classList.remove("onboarding-account-step");
  closeAccountMenu();
  if (els.onboardingAction) {
    els.onboardingAction.hidden = true;
    els.onboardingAction.onclick = null;
  }
  if (!remember) return;
  try {
    if (onboardingMode === "whats-new") {
      storeExperienceVersion(WHATS_NEW_STORAGE_KEY);
      updateFeatureBadges();
    } else {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "completed");
    }
  } catch {
    // The guide still closes when storage is unavailable.
  }
}

async function advanceOnboarding() {
  const steps = onboardingSteps();
  if (onboardingMode === "first-run" && onboardingStepIndex === 0 && isBuiltInProjectId(state.currentProjectId)) {
    await createNewProject();
  }
  if (onboardingStepIndex >= steps.length - 1) {
    finishOnboarding();
    return;
  }
  showOnboardingStep(onboardingStepIndex + 1);
}

function maybeStartOnboarding() {
  if (!onboardingShouldStart()) return;
  onboardingMode = "first-run";
  showOnboardingStep(0);
}

function startWhatsNewTour() {
  storeExperienceVersion(WELCOME_BACK_STORAGE_KEY);
  els.welcomeBackModal?.classList.add("hidden");
  onboardingMode = "whats-new";
  showOnboardingStep(0);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function getTextSnapshot() {
  return {
    value: els.content.value,
    selectionStart: els.content.selectionStart,
    selectionEnd: els.content.selectionEnd,
  };
}

function resetTextHistory() {
  window.clearTimeout(textHistory.timer);
  textHistory.timer = null;
  textHistory.stack = [getTextSnapshot()];
  textHistory.index = 0;
}

function commitTextHistory() {
  if (textHistory.restoring) return;
  window.clearTimeout(textHistory.timer);
  textHistory.timer = null;

  const snapshot = getTextSnapshot();
  const current = textHistory.stack[textHistory.index];
  if (current?.value === snapshot.value) {
    textHistory.stack[textHistory.index] = snapshot;
    return;
  }

  if (textHistory.index < textHistory.stack.length - 1) {
    textHistory.stack = textHistory.stack.slice(0, textHistory.index + 1);
  }

  textHistory.stack.push(snapshot);
  if (textHistory.stack.length > textHistory.max) {
    textHistory.stack.shift();
  } else {
    textHistory.index += 1;
  }
}

function scheduleTextHistoryCommit() {
  if (textHistory.restoring) return;
  window.clearTimeout(textHistory.timer);
  textHistory.timer = window.setTimeout(commitTextHistory, 260);
}

function restoreTextSnapshot(snapshot) {
  textHistory.restoring = true;
  els.content.value = snapshot.value;
  els.content.focus();
  els.content.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
  textHistory.restoring = false;
  requestRender();
}

function undoTextChange() {
  commitTextHistory();
  if (textHistory.index <= 0) return;
  textHistory.index -= 1;
  restoreTextSnapshot(textHistory.stack[textHistory.index]);
}

function redoTextChange() {
  commitTextHistory();
  if (textHistory.index >= textHistory.stack.length - 1) return;
  textHistory.index += 1;
  restoreTextSnapshot(textHistory.stack[textHistory.index]);
}

function handleTextShortcut(event) {
  const key = event.key.toLowerCase();
  const isModifierShortcut = (event.metaKey || event.ctrlKey) && !event.altKey;
  if (!isModifierShortcut) return;

  if (key === "b" && !event.shiftKey) {
    event.preventDefault();
    wrapSelection("bold");
    return;
  }

  if (key === "i" && !event.shiftKey) {
    event.preventDefault();
    wrapSelection("italic");
    return;
  }

  const isUndoKey = key === "z";
  if (!isUndoKey) return;
  event.preventDefault();
  if (event.shiftKey) {
    redoTextChange();
  } else {
    undoTextChange();
  }
}

function insertAtSelection(textarea, value, selectOffset = null) {
  return insertAtRange(textarea, value, textarea.selectionStart, textarea.selectionEnd, selectOffset);
}

function insertAtRange(textarea, value, start, end = start, selectOffset = null) {
  commitTextHistory();
  // 点工具栏按钮时编辑框已经失焦，这里再 focus() 会让浏览器把滚动条甩到末尾，
  // 所以和加粗那条路径一样，先记下视口再还原。
  const viewport = captureTextareaViewport(textarea);
  const current = textarea.value;
  const safeStart = clamp(Number(start) || 0, 0, current.length);
  const safeEnd = clamp(Number(end) || safeStart, safeStart, current.length);
  textarea.value = `${current.slice(0, safeStart)}${value}${current.slice(safeEnd)}`;
  const cursor = selectOffset === null ? safeStart + value.length : safeStart + selectOffset;
  restoreTextareaSelection(textarea, cursor, cursor, viewport);
  commitTextHistory();
  requestRender();
  return cursor;
}

function normalizeTextRemovalRanges(ranges) {
  const sorted = ranges
    .filter((range) => range.end > range.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const merged = [];
  for (const range of sorted) {
    const previous = merged[merged.length - 1];
    if (previous && range.start <= previous.end) {
      previous.end = Math.max(previous.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

function removeTextRanges(value, ranges) {
  let nextValue = value;
  for (const range of [...ranges].sort((a, b) => b.start - a.start)) {
    nextValue = `${nextValue.slice(0, range.start)}${nextValue.slice(range.end)}`;
  }
  return nextValue;
}

function mapPositionAfterTextRemovals(position, ranges) {
  let removed = 0;
  for (const range of ranges) {
    if (position <= range.start) break;
    removed += Math.min(position, range.end) - range.start;
    if (position <= range.end) break;
  }
  return position - removed;
}

// 一组够日常写作用的常用表情；不做搜索和分类，点一下就插到光标处。
const BASIC_EMOJI = [
  "😀", "😄", "😊", "🙂", "😉", "😍", "🤩", "😘", "😜", "🤔",
  "😅", "😂", "🥹", "😭", "😳", "😱", "😤", "🙃", "😏", "🥰",
  "👍", "👎", "👏", "🙌", "🙏", "💪", "👀", "🤝", "✌️", "🫶",
  "❤️", "💔", "✨", "⭐", "🌟", "🔥", "💡", "⚡", "🎉", "🎁",
  "🏆", "🥇", "✅", "❌", "⚠️", "❗", "❓", "💯", "🚀", "📌",
  "🔗", "📝", "📖", "📊", "📈", "📉", "⏰", "🔍", "🔔", "💬",
  "🍀", "🌸", "🌈", "☀️", "🌙", "☕", "🍰", "🎵", "🐶", "🐱",
];

// 微信自带表情是图片，复制出来只剩 [微笑] 这种占位文字，图片根本没进剪贴板。
// 这里按名字换成最接近的 Unicode 表情；微信原创、没有对应字符的一律不动。
const WECHAT_EMOTICONS = {
  微笑: "😊", 撇嘴: "😒", 色: "😍", 发呆: "😳", 得意: "😎", 流泪: "😢", 害羞: "☺️",
  闭嘴: "🤐", 睡: "😴", 大哭: "😭", 尴尬: "😅", 发怒: "😠", 调皮: "😜", 呲牙: "😁",
  惊讶: "😮", 难过: "🙁", 囧: "😖", 抓狂: "😫", 吐: "🤮", 偷笑: "🤭", 愉快: "😄",
  白眼: "🙄", 翻白眼: "🙄", 傲慢: "😤", 困: "😪", 惊恐: "😱", 憨笑: "😀", 悠闲: "😌",
  咒骂: "🤬", 疑问: "😕", 嘘: "🤫", 晕: "😵", 衰: "😩", 骷髅: "💀", 敲打: "🔨",
  再见: "👋", 擦汗: "😓", 鼓掌: "👏", 坏笑: "😏", 右哼哼: "😤", 左哼哼: "😤",
  鄙视: "😒", 委屈: "🥺", 快哭了: "😢", 阴险: "😏", 亲亲: "😘", 可怜: "🥺",
  笑脸: "😄", 生病: "🤒", 破涕为笑: "🥲", 吐舌: "😝", 脸红: "😊", 恐惧: "😨",
  失望: "😞", 无语: "😑", 嘿哈: "😆", 捂脸: "🤦", 奸笑: "😏", 机智: "🤓",
  皱眉: "😟", 耶: "✌️", 吃瓜: "🍉", 加油: "💪", 汗: "😰", 天啊: "😱", 社会社会: "😎",
  旺柴: "🐶", 好的: "👌", 打脸: "😣", 哇: "😲", 让我看看: "👀", 叹气: "😮‍💨",
  苦涩: "😖", 裂开: "😵", 嘴唇: "💋", 爱心: "❤️", 心碎: "💔", 拥抱: "🤗",
  强: "👍", 弱: "👎", 差劲: "👎", 握手: "🤝", 胜利: "✌️", 抱拳: "🙏", 合十: "🙏",
  勾引: "👈", 拳头: "✊", OK: "👌", 菜刀: "🔪", 西瓜: "🍉", 啤酒: "🍺", 咖啡: "☕",
  猪头: "🐷", 玫瑰: "🌹", 凋谢: "🥀", 蛋糕: "🎂", 炸弹: "💣", 便便: "💩",
  月亮: "🌙", 太阳: "☀️", 礼物: "🎁", 红包: "🧧", 發: "💰", 福: "🧧",
  烟花: "🎆", 爆竹: "🧨", 庆祝: "🎉", 转圈: "💫", 发抖: "🥶", 怄火: "😡",
  磕头: "🙇", 投降: "🏳️", 激动: "🤩", 献吻: "😘", 爱你: "❤️", 跳跳: "🤸",
  鸡: "🐔", 象: "🐘", 恭喜发财: "🤑", 皮卡: "⚡",
};

function convertWechatEmoticons(text) {
  let converted = 0;
  const unknown = new Set();
  // 半角和全角方括号都收；排除 [[image:…]] 引用（含冒号）和 Markdown 链接（右括号后跟左圆括号）
  const next = String(text || "").replace(/[\[［]([^\[\]［］\n:]{1,8})[\]］](?!\()/g, (whole, rawName) => {
    const name = rawName.trim();
    const emoji = WECHAT_EMOTICONS[name];
    if (emoji) {
      converted += 1;
      return emoji;
    }
    // 只把「短且含中文」的当成可能的表情名记下来，避免把 [TODO]、a[0] 也算进去
    if (/[\u4e00-\u9fa5]/.test(name) && name.length <= 6) unknown.add(name);
    return whole;
  });
  return { text: next, converted, unknown: [...unknown] };
}

function buildEmojiGrid() {
  if (!els.emojiGrid || els.emojiGrid.childElementCount) return;
  for (const emoji of BASIC_EMOJI) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "emoji-button";
    button.textContent = emoji;
    button.title = `插入 ${emoji}`;
    button.setAttribute("aria-label", `插入表情 ${emoji}`);
    button.addEventListener("click", () => insertEmoji(emoji));
    els.emojiGrid.append(button);
  }
}

function insertEmoji(emoji) {
  // 面板打开时编辑框已失焦，selectionStart 仍停在用户上次的位置。
  const cursor = els.content.selectionStart ?? els.content.value.length;
  insertAtRange(els.content, emoji, cursor, els.content.selectionEnd ?? cursor);
  if (els.emojiMenu) els.emojiMenu.open = false;
  els.status.textContent = `已插入 ${emoji}`;
}

// 复制模式：把正文转成纯文本——去掉图片、星号、颜色/背景/下划线标记
// 和标题、引用前缀，适合粘贴到不认 Markdown 的正文区。
function plainTextForCopy(content) {
  let text = String(content || "").replace(/\r\n/g, "\n");

  // 整行图片（含拼图与 Obsidian / Markdown 图片语法）
  text = text
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      if (/^\[\[image:[\w-]+(?:\|[\w-]+){0,2}\]\]$/.test(trimmed)) return false;
      return !isMarkdownImageBlock(trimmed);
    })
    .join("\n");

  // 行内图片引用
  text = text.replace(/\[\[image:[\w-]+(?:\|[\w-]+){0,2}\]\]/g, "");

  // 颜色 / 背景 / 下划线 / 字号标记：保留内文，循环剥掉嵌套
  let previous;
  do {
    previous = text;
    text = text.replace(/\{\{(?:color|bg|underline|size):[^|{}]*\|([\s\S]*?)\}\}/g, "$1");
  } while (text !== previous);

  // 加粗 / 斜体星号
  do {
    previous = text;
    text = text.replace(/\*{1,3}([^*\n]+)\*{1,3}/g, "$1");
  } while (text !== previous);

  // 标题与引用前缀
  text = text.replace(/^(\s*)#{1,6}\s+/gm, "$1").replace(/^(\s*)>\s?/gm, "$1");

  // 删图片行留下的连续空行收敛为一个空行
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

async function copyPlainTextToClipboard() {
  const text = plainTextForCopy(els.content.value);
  if (!text) {
    els.status.textContent = "正文还是空的，没有可复制的内容";
    return;
  }
  let copied = false;
  try {
    await navigator.clipboard.writeText(text);
    copied = true;
  } catch {
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.append(helper);
    helper.select();
    copied = document.execCommand("copy");
    helper.remove();
  }
  els.status.textContent = copied
    ? "已复制全文纯文本（图片与格式已去除）"
    : "复制失败，请手动全选复制";
}

// 跨行选区的加粗/斜体：星号对不能跨行生效（解析按行进行），
// 所以逐行分别包裹或取消，块前缀（标题/引用/列表）留在标记外面。
function toggleMultilineInlineStyle(kind) {
  const textarea = els.content;
  const viewport = captureTextareaViewport(textarea);
  const value = textarea.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const delimiter = kind === "bold" ? "**" : "*";
  const label = kind === "bold" ? "加粗" : "斜体";

  const parts = value.slice(start, end).split("\n").map((line) => {
    const match = line.match(/^(\s*)((?:#{1,6}\s+)|(?:>\s+)|(?:[-*+]\s+)|(?:\d+[.)]\s+))?([\s\S]*)$/);
    const lead = (match[1] || "") + (match[2] || "");
    const body = match[3] || "";
    const skip = !body.trim() || isMarkdownImageBlock(body.trim()) || body.trimStart().startsWith("|");
    if (skip) return { line, skip: true };
    const open = body.match(/^\*+/)?.[0].length || 0;
    const close = body.match(/\*+$/)?.[0].length || 0;
    const runCount = body.replace(/\*/g, "").trim() ? Math.min(open, close) : 0;
    const wrapped = kind === "bold" ? runCount >= 2 : runCount % 2 === 1;
    return { line, skip: false, lead, body, runCount, wrapped };
  });

  const formattable = parts.filter((part) => !part.skip);
  if (!formattable.length) return false;
  const removing = formattable.every((part) => part.wrapped);

  const nextLines = parts.map((part) => {
    if (part.skip) return part.line;
    if (removing) {
      const removeCount = kind === "bold"
        ? part.runCount >= 4
          ? part.runCount - (part.runCount % 2)
          : 2
        : 1;
      return part.lead + part.body.slice(removeCount, part.body.length - removeCount);
    }
    if (part.wrapped) return part.line;
    return `${part.lead}${delimiter}${part.body}${delimiter}`;
  });

  const next = nextLines.join("\n");
  commitTextHistory();
  textarea.value = `${value.slice(0, start)}${next}${value.slice(end)}`;
  restoreTextareaSelection(textarea, start, start + next.length, viewport);
  commitTextHistory();
  requestRender();
  els.status.textContent = removing ? `已取消${label}` : `已按行应用${label}`;
  return true;
}

function toggleMarkdownInlineStyle(kind) {
  const textarea = els.content;
  const viewport = captureTextareaViewport(textarea);
  const value = textarea.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const delimiter = kind === "bold" ? "**" : "*";
  const label = kind === "bold" ? "加粗" : "斜体";

  if (start !== end && value.slice(start, end).includes("\n")) {
    return toggleMultilineInlineStyle(kind);
  }

  if (start === end) {
    const placeholder = "文字";
    const nextValue = `${value.slice(0, start)}${delimiter}${placeholder}${delimiter}${value.slice(end)}`;
    commitTextHistory();
    textarea.value = nextValue;
    restoreTextareaSelection(textarea, start + delimiter.length, start + delimiter.length + placeholder.length, viewport);
    commitTextHistory();
    requestRender();
    els.status.textContent = `已应用${label}`;
    return true;
  }

  const wrappers = collectInlineFormattingWrappers(value, start, end);
  const activeStarRuns = wrappers.starRuns.filter((run) => (
    kind === "bold" ? run.count >= 2 : run.count % 2 === 1
  ));

  if (activeStarRuns.length) {
    const removals = normalizeTextRemovalRanges(activeStarRuns.flatMap((run) => {
      // 旧版本连续按加粗会产生 ****文字****。关闭加粗时一并移除
      // 所有成对的粗体星号；若还有单个星号，则保留为斜体。
      const removeCount = kind === "bold"
        ? run.count >= 4
          ? run.count - (run.count % 2)
          : 2
        : 1;
      return [
        { start: run.open, end: run.open + removeCount },
        { start: run.close, end: run.close + removeCount },
      ];
    }));
    const nextValue = removeTextRanges(value, removals);
    const selectFrom = mapPositionAfterTextRemovals(wrappers.visible.start, removals);
    const selectTo = mapPositionAfterTextRemovals(wrappers.visible.end, removals);
    commitTextHistory();
    textarea.value = nextValue;
    restoreTextareaSelection(textarea, selectFrom, selectTo, viewport);
    commitTextHistory();
    requestRender();
    els.status.textContent = `已取消${label}`;
    return true;
  }

  const selected = value.slice(start, end);
  const nextValue = `${value.slice(0, start)}${delimiter}${selected}${delimiter}${value.slice(end)}`;
  const wrappedStart = start + delimiter.length;
  const visible = unwrapInlineStyleBounds(nextValue, wrappedStart, wrappedStart + selected.length);
  commitTextHistory();
  textarea.value = nextValue;
  restoreTextareaSelection(textarea, visible.start, visible.end, viewport);
  commitTextHistory();
  requestRender();
  els.status.textContent = `已应用${label}`;
  return true;
}

function wrapSelection(kind) {
  if (kind === "underline-none") {
    removeUnderlineFromSelection();
    return;
  }
  if (kind === "underline-solid" || kind === "underline-dashed") {
    applyUnderlineToSelection(kind === "underline-dashed" ? "dashed" : "solid");
    return;
  }
  if (kind === "h1" || kind === "h2" || kind === "quote") {
    applyBlockStyleToSelection(kind);
    return;
  }
  if (kind === "bold" || kind === "italic") toggleMarkdownInlineStyle(kind);
}

function captureTextareaViewport(textarea) {
  return {
    scrollTop: textarea.scrollTop,
    scrollLeft: textarea.scrollLeft,
    windowX: window.scrollX,
    windowY: window.scrollY,
  };
}

function restoreTextareaSelection(textarea, start, end, viewport) {
  const restore = () => {
    textarea.scrollTop = viewport.scrollTop;
    textarea.scrollLeft = viewport.scrollLeft;
    window.scrollTo(viewport.windowX, viewport.windowY);
  };
  textarea.focus({ preventScroll: true });
  textarea.setSelectionRange(start, end);
  restore();
  requestAnimationFrame(restore);
}

function applyBlockStyleToSelection(kind) {
  const prefix = kind === "h1" ? "# " : kind === "h2" ? "## " : "> ";
  const label = kind === "h1" ? "标题 1" : kind === "h2" ? "标题 2" : "引用";
  const textarea = els.content;
  const viewport = captureTextareaViewport(textarea);
  const value = textarea.value;
  const selectionStart = textarea.selectionStart;
  const selectionEnd = textarea.selectionEnd;
  const lineStart = value.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;
  const endsAtNextLine = selectionEnd > selectionStart && value[selectionEnd - 1] === "\n";
  const effectiveEnd = endsAtNextLine ? selectionEnd - 1 : selectionEnd;
  const nextLineBreak = value.indexOf("\n", effectiveEnd);
  const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak;
  const block = value.slice(lineStart, lineEnd);
  const edits = [];
  let offset = 0;

  const transformed = block.split("\n").map((line) => {
    const indent = line.match(/^\s*/)?.[0] || "";
    const afterIndent = line.slice(indent.length);
    const marker = afterIndent.match(/^(?:#{1,6}|>)\s+/)?.[0] || "";
    const content = afterIndent.slice(marker.length);
    const isActiveEmptyLine = selectionStart === selectionEnd
      && selectionStart >= lineStart + offset
      && selectionStart <= lineStart + offset + line.length;
    const replacement = content.length || isActiveEmptyLine ? prefix : "";
    edits.push({
      start: lineStart + offset + indent.length,
      end: lineStart + offset + indent.length + marker.length,
      replacementLength: replacement.length,
    });
    offset += line.length + 1;
    return `${indent}${replacement}${content}`;
  }).join("\n");

  const mapPosition = (position) => {
    let delta = 0;
    for (const edit of edits) {
      if (position < edit.start) break;
      if (position <= edit.end) return edit.start + delta + edit.replacementLength;
      delta += edit.replacementLength - (edit.end - edit.start);
    }
    return position + delta;
  };

  commitTextHistory();
  textarea.value = `${value.slice(0, lineStart)}${transformed}${value.slice(lineEnd)}`;
  restoreTextareaSelection(textarea, mapPosition(selectionStart), mapPosition(selectionEnd), viewport);
  commitTextHistory();
  requestRender();
  els.status.textContent = `已应用${label}；仍可叠加粗体、斜体、颜色和下划线`;
}

const TEXT_COLOR_PRESETS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#111827"];
const BG_COLOR_PRESETS = ["#fee2e2", "#ffedd5", "#fef9c3", "#dcfce7", "#dbeafe", "#ede9fe", "#fce7f3", "#f3f4f6"];

function colorPaletteKind(kind) {
  return kind === "color" ? "color" : "bg";
}

function builtInColorsForKind(kind) {
  return colorPaletteKind(kind) === "color" ? TEXT_COLOR_PRESETS : BG_COLOR_PRESETS;
}

function normalizePaletteColor(color) {
  const normalized = String(color || "").trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(normalized) ? normalized : "";
}

function normalizeCustomColorPalette(value) {
  const normalized = { color: [], bg: [] };
  for (const kind of ["color", "bg"]) {
    const seen = new Set();
    const builtIn = new Set(builtInColorsForKind(kind));
    const colors = Array.isArray(value?.[kind]) ? value[kind] : [];
    for (const color of colors) {
      const next = normalizePaletteColor(color);
      if (!next || builtIn.has(next) || seen.has(next)) continue;
      seen.add(next);
      normalized[kind].push(next);
      if (normalized[kind].length >= MAX_SAVED_CUSTOM_COLORS) break;
    }
  }
  return normalized;
}

function loadCustomColorPalette() {
  try {
    const raw = storageForScope().getItem(scopedStorageKey(CUSTOM_COLOR_PALETTE_STORAGE_KEY));
    return normalizeCustomColorPalette(raw ? JSON.parse(raw) : null);
  } catch {
    return { color: [], bg: [] };
  }
}

function saveCustomColorPalette(palette) {
  try {
    storageForScope().setItem(
      scopedStorageKey(CUSTOM_COLOR_PALETTE_STORAGE_KEY),
      JSON.stringify(normalizeCustomColorPalette(palette)),
    );
    return true;
  } catch {
    return false;
  }
}

function rememberCustomColor(kind, color) {
  const paletteKind = colorPaletteKind(kind);
  const normalized = normalizePaletteColor(color);
  if (!normalized || builtInColorsForKind(paletteKind).includes(normalized)) return false;
  const palette = loadCustomColorPalette();
  palette[paletteKind] = [
    normalized,
    ...palette[paletteKind].filter((item) => item !== normalized),
  ].slice(0, MAX_SAVED_CUSTOM_COLORS);
  if (!saveCustomColorPalette(palette)) {
    els.status.textContent = "颜色已选择，但暂时无法保存到本机色板";
    return false;
  }
  buildSelectionSwatches(paletteKind);
  return true;
}

function clearSavedCustomColors(kind) {
  const paletteKind = colorPaletteKind(kind);
  const palette = loadCustomColorPalette();
  if (!palette[paletteKind].length) return;
  palette[paletteKind] = [];
  if (!saveCustomColorPalette(palette)) {
    els.status.textContent = "保存的颜色暂时无法清空";
    return;
  }
  buildSelectionSwatches(paletteKind);
  els.status.textContent = paletteKind === "color" ? "已清空保存的字体颜色" : "已清空保存的背景色";
}

function setCurrentTextColor(color) {
  const normalized = normalizePaletteColor(color) || color;
  els.inlineColor.value = normalized;
  if (els.selectionCustomColor) els.selectionCustomColor.value = normalized;
  document.documentElement.style.setProperty("--brush-color", normalized);
  if (els.selectionColorDot) els.selectionColorDot.style.background = normalized;
}

function setCurrentBgColor(color) {
  const normalized = normalizePaletteColor(color) || color;
  els.inlineBgColor.value = normalized;
  if (els.selectionCustomBg) els.selectionCustomBg.value = normalized;
  document.documentElement.style.setProperty("--text-bg-brush-color", normalized);
  if (els.selectionBgColorDot) els.selectionBgColorDot.style.background = normalized;
}

function findMatchingMarkerClose(value, open) {
  const pipe = value.indexOf("|", open);
  if (pipe === -1) return -1;
  let depth = 0;
  for (let i = pipe + 1; i < value.length; i += 1) {
    if (value.startsWith("{{", i)) {
      depth += 1;
      i += 1;
    } else if (value.startsWith("}}", i)) {
      if (depth === 0) return i + 2;
      depth -= 1;
      i += 1;
    }
  }
  return -1;
}

function flattenMarkerKind(text, marker) {
  const openToken = `{{${marker}:`;
  let out = "";
  let i = 0;
  while (i < text.length) {
    if (text.startsWith(openToken, i)) {
      const close = findMatchingMarkerClose(text, i);
      if (close !== -1) {
        const pipe = text.indexOf("|", i) + 1;
        out += flattenMarkerKind(text.slice(pipe, close - 2), marker);
        i = close;
        continue;
      }
    }
    out += text[i];
    i += 1;
  }
  return out;
}

const INLINE_STYLE_MARKERS = ["color", "bg", "underline", "size"];

/** 去掉全文所有 {{color/bg/underline/size:…|…}} 标记，只留里面的文字；可撤销。 */
async function clearAllInlineStyles() {
  const textarea = els.content;
  const value = textarea.value;
  const nextValue = INLINE_STYLE_MARKERS.reduce((text, marker) => flattenMarkerKind(text, marker), value);
  if (nextValue === value) {
    els.status.textContent = "正文里没有自定义样式";
    return;
  }
  const viewport = captureTextareaViewport(textarea);
  commitTextHistory();
  const caret = Math.min(textarea.selectionStart, nextValue.length);
  textarea.value = nextValue;
  restoreTextareaSelection(textarea, caret, caret, viewport);
  commitTextHistory();
  // 渲染会改写状态栏，渲染完再提示
  await render();
  els.status.textContent = "已清除全部颜色、背景色、下划线和字号，可按 Ctrl/⌘+Z 撤销";
}

function countStarsBefore(value, position, limit = 0) {
  let count = 0;
  for (let index = position - 1; index >= limit && value[index] === "*"; index -= 1) count += 1;
  return count;
}

function countStarsAfter(value, position, limit = value.length) {
  let count = 0;
  for (let index = position; index < limit && value[index] === "*"; index += 1) count += 1;
  return count;
}

function starRunAroundBounds(value, start, end) {
  const count = Math.min(countStarsBefore(value, start), countStarsAfter(value, end));
  if (!count) return null;
  return { open: start - count, close: end, count };
}

function findExactInlineMarkerWrapper(value, start, end) {
  const candidates = ["color", "bg", "underline", "size"].map((marker) => {
    const target = findEnclosingMarker(value, start, end, marker);
    if (!target) return null;
    const innerStart = value.indexOf("|", target.open) + 1;
    if (innerStart !== start || target.close - 2 !== end) return null;
    return { ...target, marker };
  }).filter(Boolean);
  return candidates.sort((a, b) => b.open - a.open)[0] || null;
}

function collectInlineFormattingWrappers(value, start, end) {
  const visible = unwrapInlineStyleBounds(value, start, end);
  const starRuns = [];
  let outerStart = visible.start;
  let outerEnd = visible.end;

  // 选区通常只覆盖最里层可见文字。逐层向外穿过 Markdown 星号与
  // 自定义颜色标记，才能判断当前样式究竟已开启还是尚未开启。
  for (let guard = 0; guard < 32; guard += 1) {
    const stars = starRunAroundBounds(value, outerStart, outerEnd);
    if (stars) {
      starRuns.push(stars);
      outerStart = stars.open;
      outerEnd = stars.close + stars.count;
      continue;
    }

    const marker = findExactInlineMarkerWrapper(value, outerStart, outerEnd);
    if (!marker) break;
    outerStart = marker.open;
    outerEnd = marker.close;
  }

  return { visible, starRuns };
}

function unwrapInlineStyleBounds(value, start, end) {
  let innerStart = start;
  let innerEnd = end;

  // 颜色与其他行内格式可以彼此嵌套。重新上色时，选区通常只覆盖最里层
  // 的文字，而不是外层标记本身；逐层剥开完整包住选区的格式，才能识别
  // 这其实是在“换色”，而不是再包一层同类标记。
  while (innerStart < innerEnd) {
    const colorMatch = matchInlineMarker(value, innerStart, "color");
    const bgMatch = colorMatch ? null : matchInlineMarker(value, innerStart, "bg");
    const underlineMatch = colorMatch || bgMatch ? null : matchUnderlineMarker(value, innerStart);
    const sizeMatch = colorMatch || bgMatch || underlineMatch ? null : matchSizeMarker(value, innerStart);
    const inlineMatch = colorMatch || bgMatch || underlineMatch || sizeMatch;

    if (inlineMatch && inlineMatch.end === innerEnd) {
      innerStart = inlineMatch.innerStart;
      innerEnd = inlineMatch.innerEnd;
      continue;
    }

    const starCount = Math.min(
      countStarsAfter(value, innerStart, innerEnd),
      countStarsBefore(value, innerEnd, innerStart),
    );
    if (starCount && innerStart + starCount <= innerEnd - starCount) {
      innerStart += starCount;
      innerEnd -= starCount;
      continue;
    }

    break;
  }

  return { start: innerStart, end: innerEnd };
}

function findRecolorableMarker(value, start, end, marker) {
  const openToken = `{{${marker}:`;
  let searchFrom = start;
  let fallback = null;
  let recolor = null;
  while (searchFrom >= 0) {
    const open = value.lastIndexOf(openToken, searchFrom);
    if (open === -1) break;
    searchFrom = open - 1;
    const close = findMatchingMarkerClose(value, open);
    if (close === -1) continue;

    // 保留原有的“直接选中标记”行为；常规划词则必须覆盖该标记的全部
    // 可见文本，避免把只选中的一小段误判为整段换色。
    if (open === start && end <= close) fallback = { open, close };
    if (open > start || close < end) continue;

    const innerStart = value.indexOf("|", open) + 1;
    const visible = unwrapInlineStyleBounds(value, innerStart, close - 2);
    // 继续向外查找，而不是命中最内层就退出：旧版本已经产生的同类嵌套
    // 需要一次换色就被扁平化清理掉。
    if (visible.start === start && visible.end === end) recolor = { open, close };
    else if (close === end || close === end + 2) fallback = { open, close };
  }
  return recolor || fallback;
}

function findEnclosingMarker(value, start, end, marker) {
  const openToken = `{{${marker}:`;
  let searchFrom = start;
  while (searchFrom >= 0) {
    const open = value.lastIndexOf(openToken, searchFrom);
    if (open === -1) return null;
    searchFrom = open - 1;
    const close = findMatchingMarkerClose(value, open);
    if (close === -1) continue;
    const innerStart = value.indexOf("|", open) + 1;
    if (innerStart <= start && end <= close - 2) return { open, close };
  }
  return null;
}

function underlineStyleForMarker(value, marker) {
  if (!marker) return "";
  return value.slice(marker.open).match(/^\{\{underline:(solid|dashed)\|/)?.[1] || "";
}

function selectionInlineFontSize() {
  const value = els.content.value;
  const marker = findRecolorableMarker(value, els.content.selectionStart, els.content.selectionEnd, "size")
    || findEnclosingMarker(value, els.content.selectionStart, els.content.selectionEnd, "size");
  return marker ? matchSizeMarker(value, marker.open)?.size || null : null;
}

// 与换色同一套规则：选区已整段带字号时直接改数字并扁平化内层同类标记，
// 否则在选区外包一层 {{size:N|…}}。
function prefillInlineSizeInput(panel) {
  const input = panel?.querySelector("[data-inline-size-input]");
  if (!input) return;
  input.value = String(selectionInlineFontSize() || normalizeInlineFontSize(els.fontSize.value) || DEFAULT_CARD_FONT_SIZE);
}

function applyFontSizeToSelection(rawSize) {
  const size = normalizeInlineFontSize(rawSize);
  if (!size) {
    els.status.textContent = `请输入 ${INLINE_FONT_SIZE_MIN}–${INLINE_FONT_SIZE_MAX} 之间的字号`;
    return false;
  }
  const textarea = els.content;
  const viewport = captureTextareaViewport(textarea);
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  if (start === end) {
    els.status.textContent = "请先选中要调整字号的文字";
    return false;
  }
  const markerOpen = `{{size:${size}|`;
  const value = textarea.value;
  commitTextHistory();
  let nextValue;
  let selectFrom;
  let selectTo;
  const existing = findRecolorableMarker(value, start, end, "size");
  if (existing) {
    const innerStart = value.indexOf("|", existing.open) + 1;
    const inner = flattenMarkerKind(value.slice(innerStart, existing.close - 2), "size");
    nextValue = `${value.slice(0, existing.open)}${markerOpen}${inner}}}${value.slice(existing.close)}`;
    const nextInnerStart = existing.open + markerOpen.length;
    const visible = unwrapInlineStyleBounds(nextValue, nextInnerStart, nextInnerStart + inner.length);
    selectFrom = visible.start;
    selectTo = visible.end;
  } else {
    const selected = value.slice(start, end);
    nextValue = `${value.slice(0, start)}${markerOpen}${selected}}}${value.slice(end)}`;
    selectFrom = start + markerOpen.length;
    selectTo = selectFrom + selected.length;
  }
  textarea.value = nextValue;
  restoreTextareaSelection(textarea, selectFrom, selectTo, viewport);
  commitTextHistory();
  requestRender();
  els.status.textContent = `已应用字号 ${size}`;
  return true;
}

function removeFontSizeFromSelection() {
  const textarea = els.content;
  const viewport = captureTextareaViewport(textarea);
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  if (start === end) {
    els.status.textContent = "请先选中要恢复字号的文字";
    return false;
  }
  const value = textarea.value;
  const target = findRecolorableMarker(value, start, end, "size")
    || findEnclosingMarker(value, start, end, "size");
  if (!target) {
    els.status.textContent = "选中内容没有单独设置字号";
    return false;
  }
  const innerStart = value.indexOf("|", target.open) + 1;
  const inner = flattenMarkerKind(value.slice(innerStart, target.close - 2), "size");
  const nextValue = `${value.slice(0, target.open)}${inner}${value.slice(target.close)}`;
  const visible = unwrapInlineStyleBounds(nextValue, target.open, target.open + inner.length);
  commitTextHistory();
  textarea.value = nextValue;
  restoreTextareaSelection(textarea, visible.start, visible.end, viewport);
  commitTextHistory();
  requestRender();
  els.status.textContent = "已恢复默认字号";
  return true;
}

function applyColorToSelection(kind, color) {
  const textarea = els.content;
  const viewport = captureTextareaViewport(textarea);
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  if (start === end) return false;
  const marker = kind === "color" ? "color" : "bg";
  const markerOpen = `{{${marker}:${color}|`;
  const value = textarea.value;
  const selected = value.slice(start, end);
  commitTextHistory();
  let nextValue;
  let selectFrom;
  let keepSelected = selected;
  const recolor = findRecolorableMarker(value, start, end, marker);
  if (recolor) {
    const innerStart = value.indexOf("|", recolor.open) + 1;
    const inner = flattenMarkerKind(value.slice(innerStart, recolor.close - 2), marker);
    nextValue = `${value.slice(0, recolor.open)}${markerOpen}${inner}}}`.concat(value.slice(recolor.close));
    const nextInnerStart = recolor.open + markerOpen.length;
    const visible = unwrapInlineStyleBounds(nextValue, nextInnerStart, nextInnerStart + inner.length);
    selectFrom = visible.start;
    keepSelected = nextValue.slice(visible.start, visible.end);
  } else {
    nextValue = `${value.slice(0, start)}${markerOpen}${selected}}}`.concat(value.slice(end));
    selectFrom = start + markerOpen.length;
  }
  textarea.value = nextValue;
  restoreTextareaSelection(textarea, selectFrom, selectFrom + keepSelected.length, viewport);
  commitTextHistory();
  requestRender();
  els.status.textContent = kind === "color" ? `已应用字体颜色 ${color}` : `已应用背景色 ${color}`;
  return true;
}

function removeColorFromSelection(kind) {
  const textarea = els.content;
  const viewport = captureTextareaViewport(textarea);
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const marker = colorPaletteKind(kind);
  const label = marker === "color" ? "字体颜色" : "背景色";
  if (start === end) {
    els.status.textContent = `请先选中要清除${label}的文字`;
    return false;
  }

  const value = textarea.value;
  const target = findRecolorableMarker(value, start, end, marker)
    || findEnclosingMarker(value, start, end, marker);
  if (!target) {
    els.status.textContent = `选中内容没有${label}`;
    return false;
  }

  const innerStart = value.indexOf("|", target.open) + 1;
  const inner = flattenMarkerKind(value.slice(innerStart, target.close - 2), marker);
  const nextValue = `${value.slice(0, target.open)}${inner}${value.slice(target.close)}`;
  const visible = unwrapInlineStyleBounds(nextValue, target.open, target.open + inner.length);
  commitTextHistory();
  textarea.value = nextValue;
  restoreTextareaSelection(textarea, visible.start, visible.end, viewport);
  commitTextHistory();
  requestRender();
  els.status.textContent = `已清除${label}`;
  return true;
}

function applyUnderlineToSelection(style) {
  const underlineStyle = style === "dashed" ? "dashed" : "solid";
  const textarea = els.content;
  const viewport = captureTextareaViewport(textarea);
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selected = value.slice(start, end) || "文字";
  const markerOpen = `{{underline:${underlineStyle}|`;
  const existing = start === end
    ? null
    : findRecolorableMarker(value, start, end, "underline")
      || findEnclosingMarker(value, start, end, "underline");
  if (existing && underlineStyleForMarker(value, existing) === underlineStyle) {
    return removeUnderlineFromSelection(existing, viewport);
  }
  commitTextHistory();
  let nextValue;
  let selectFrom;
  let keepSelected = selected;
  const rewrite = start === end ? null : findRecolorableMarker(value, start, end, "underline");
  if (rewrite) {
    const innerStart = value.indexOf("|", rewrite.open) + 1;
    const inner = flattenMarkerKind(value.slice(innerStart, rewrite.close - 2), "underline");
    nextValue = `${value.slice(0, rewrite.open)}${markerOpen}${inner}}}`.concat(value.slice(rewrite.close));
    const nextInnerStart = rewrite.open + markerOpen.length;
    const visible = unwrapInlineStyleBounds(nextValue, nextInnerStart, nextInnerStart + inner.length);
    selectFrom = visible.start;
    keepSelected = nextValue.slice(visible.start, visible.end);
  } else {
    nextValue = `${value.slice(0, start)}${markerOpen}${selected}}}`.concat(value.slice(end));
    selectFrom = start + markerOpen.length;
  }
  textarea.value = nextValue;
  restoreTextareaSelection(textarea, selectFrom, selectFrom + keepSelected.length, viewport);
  commitTextHistory();
  requestRender();
  els.status.textContent = `已应用${underlineStyle === "dashed" ? "虚线" : "实线"}下划线`;
  return true;
}

function removeUnderlineFromSelection(target = null, capturedViewport = null) {
  const textarea = els.content;
  const viewport = capturedViewport || captureTextareaViewport(textarea);
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  if (start === end) {
    els.status.textContent = "请先选中要取消下划线的文字";
    return false;
  }
  const value = textarea.value;
  const underline = target
    || findRecolorableMarker(value, start, end, "underline")
    || findEnclosingMarker(value, start, end, "underline");
  if (!underline) {
    els.status.textContent = "选中内容没有下划线";
    return false;
  }

  const innerStart = value.indexOf("|", underline.open) + 1;
  const inner = flattenMarkerKind(value.slice(innerStart, underline.close - 2), "underline");
  const nextValue = `${value.slice(0, underline.open)}${inner}${value.slice(underline.close)}`;
  const visible = unwrapInlineStyleBounds(nextValue, underline.open, underline.open + inner.length);
  commitTextHistory();
  textarea.value = nextValue;
  restoreTextareaSelection(textarea, visible.start, visible.end, viewport);
  commitTextHistory();
  requestRender();
  els.status.textContent = "已取消下划线";
  return true;
}

function customColorIsAvailable(kind, color) {
  const paletteKind = colorPaletteKind(kind);
  const normalized = normalizePaletteColor(color);
  if (!normalized) return false;
  return builtInColorsForKind(paletteKind).includes(normalized)
    || loadCustomColorPalette()[paletteKind].includes(normalized);
}

function applyCustomColorChoice(kind, shouldSave) {
  const color = kind === "color" ? els.inlineColor.value : els.inlineBgColor.value;
  if (shouldSave) rememberCustomColor(kind, color);
  const saved = shouldSave && customColorIsAvailable(kind, color);
  if (applyColorToSelection(kind, color)) {
    if (kind === "color") {
      els.colorMenu.open = false;
    } else {
      els.bgColorMenu.open = false;
    }
    setSelectionPalette(null, false);
    els.status.textContent = shouldSave
      ? saved
        ? "已应用颜色，并保存到个人色板"
        : "已应用颜色，但暂时无法保存到色板"
      : "已应用颜色，仅本次使用";
  } else {
    els.status.textContent = saved
      ? "颜色已保存到个人色板；请先选中文字再使用"
      : "请先在文本框选中要上色的文字";
  }
}

function updatePendingCustomColor(kind, color) {
  if (kind === "color") setCurrentTextColor(color);
  else setCurrentBgColor(color);
  refreshSelectionToolbarColors();
  els.status.textContent = "颜色已选择，请选择仅本次或保存并使用";
}

let selectionToolbarTimer = null;
let selectionMirror = null;
let selectionTouchTimer = null;
let textareaOwnsSelection = false;
let touchSelectionGraceUntil = 0;
let selectionToolbarInteractionUntil = 0;

function textareaHasActionableSelection() {
  const textarea = els.content;
  return Boolean(
    textarea
    && textarea.selectionStart !== textarea.selectionEnd
    && document.body.getAttribute("data-guide-readonly") !== "true"
  );
}

function textareaSelectionCanShowToolbar() {
  return textareaHasActionableSelection()
    && (document.activeElement === els.content || textareaOwnsSelection);
}

function claimTextareaSelection({ touch = false } = {}) {
  textareaOwnsSelection = true;
  if (touch) touchSelectionGraceUntil = Date.now() + 3000;
}

function releaseTextareaSelection() {
  textareaOwnsSelection = false;
  touchSelectionGraceUntil = 0;
  selectionToolbarInteractionUntil = 0;
  if (selectionTouchTimer !== null) {
    clearTimeout(selectionTouchTimer);
    selectionTouchTimer = null;
  }
  hideSelectionToolbar();
}

function handleSelectionInteractionStart(event) {
  const target = event.target;
  if (target === els.content) {
    claimTextareaSelection({ touch: event.type === "touchstart" || event.pointerType === "touch" });
    return;
  }
  if (els.selectionToolbar?.contains(target)) {
    selectionToolbarInteractionUntil = Date.now() + 2000;
    return;
  }
  releaseTextareaSelection();
}

function finishTouchSelection() {
  claimTextareaSelection({ touch: true });
  if (selectionTouchTimer !== null) clearTimeout(selectionTouchTimer);
  // Safari 会在 touchend 之后才最终写入 selectionStart / selectionEnd。
  selectionTouchTimer = window.setTimeout(() => {
    selectionTouchTimer = null;
    scheduleSelectionToolbar();
  }, 180);
}

function setSelectionPalette(kind, open) {
  const palettes = {
    color: els.selectionColorPalette,
    bg: els.selectionBgPalette,
    underline: els.selectionUnderlinePalette,
    size: els.selectionSizePalette,
  };
  Object.entries(palettes).forEach(([name, palette]) => {
    if (!palette) return;
    const visible = Boolean(open && name === kind);
    palette.hidden = !visible;
    if (!visible) {
      palette.querySelectorAll(".selection-custom-color-disclosure").forEach((details) => {
        details.open = false;
      });
    }
  });
  if (open && palettes[kind]) {
    window.requestAnimationFrame(() => {
      if (!els.selectionToolbar?.hidden && textareaSelectionCanShowToolbar()) showSelectionToolbar();
    });
  }
}

function selectionPaletteIsOpen() {
  return !els.selectionColorPalette?.hidden
    || !els.selectionBgPalette?.hidden
    || !els.selectionUnderlinePalette?.hidden
    || !els.selectionSizePalette?.hidden;
}

function refreshSelectionToolbarColors() {
  if (els.selectionColorDot) els.selectionColorDot.style.background = els.inlineColor.value;
  if (els.selectionBgColorDot) els.selectionBgColorDot.style.background = els.inlineBgColor.value;
}

function keepTextareaSelection(event) {
  event.preventDefault();
}

function appendSelectionSwatchSection(container, kind, label, colors, { saved = false } = {}) {
  if (!colors.length) return;
  const section = document.createElement("section");
  section.className = "selection-swatch-section";
  const heading = document.createElement("div");
  heading.className = "selection-swatch-heading";
  const title = document.createElement("span");
  title.textContent = label;
  heading.appendChild(title);

  if (saved) {
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "selection-swatch-clear";
    clear.textContent = "清空";
    clear.title = "清空保存的颜色";
    clear.setAttribute("aria-label", `清空保存的${kind === "color" ? "字体" : "背景"}颜色`);
    clear.addEventListener("mousedown", keepTextareaSelection);
    clear.addEventListener("click", () => clearSavedCustomColors(kind));
    heading.appendChild(clear);
  }

  const grid = document.createElement("div");
  grid.className = "selection-swatch-grid";
  for (const color of colors) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "selection-swatch";
    button.title = saved ? `已保存：${color}` : color;
    button.setAttribute("aria-label", `${saved ? "应用已保存颜色" : "应用颜色"} ${color}`);
    button.style.background = color;
    button.addEventListener("mousedown", keepTextareaSelection);
    button.addEventListener("click", () => {
      applyColorToSelection(kind, color);
      if (kind === "color") setCurrentTextColor(color);
      else setCurrentBgColor(color);
      setSelectionPalette(kind, false);
      refreshSelectionToolbarColors();
    });
    grid.appendChild(button);
  }

  section.append(heading, grid);
  container.appendChild(section);
}

function buildSelectionSwatches(kind) {
  const paletteKind = colorPaletteKind(kind);
  const container = paletteKind === "color" ? els.selectionColorSwatches : els.selectionBgSwatches;
  if (!container) return;
  const saved = loadCustomColorPalette()[paletteKind];
  container.replaceChildren();
  appendSelectionSwatchSection(container, paletteKind, "已保存", saved, { saved: true });
  appendSelectionSwatchSection(container, paletteKind, "默认", builtInColorsForKind(paletteKind));
}

function ensureSelectionMirror() {
  if (selectionMirror) return selectionMirror;
  const mirror = document.createElement("div");
  mirror.setAttribute("aria-hidden", "true");
  mirror.style.cssText = "position:fixed;left:0;top:0;visibility:hidden;overflow:hidden;pointer-events:none;z-index:-1;white-space:pre-wrap;";
  document.body.appendChild(mirror);
  selectionMirror = mirror;
  return mirror;
}

function measureSelectionInTextarea(textarea) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  if (start === end) return null;
  const mirror = ensureSelectionMirror();
  const cs = window.getComputedStyle(textarea);
  const taRect = textarea.getBoundingClientRect();
  const props = [
    "fontFamily", "fontSize", "fontWeight", "fontStyle", "lineHeight", "letterSpacing", "wordSpacing",
    "textIndent", "textTransform", "tabSize", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth", "boxSizing",
    "wordBreak", "overflowWrap", "textAlign", "borderRadius",
  ];
  for (const prop of props) mirror.style[prop] = cs[prop];
  mirror.style.left = `${taRect.left - textarea.scrollLeft}px`;
  mirror.style.top = `${taRect.top - textarea.scrollTop}px`;
  mirror.style.width = `${textarea.offsetWidth}px`;
  mirror.style.height = `${textarea.offsetHeight}px`;
  mirror.replaceChildren();
  const startMarker = document.createElement("span");
  startMarker.textContent = "\u200b";
  const selectedText = document.createElement("span");
  selectedText.textContent = textarea.value.slice(start, end) || "\u200b";
  const endMarker = document.createElement("span");
  endMarker.textContent = "\u200b";
  mirror.append(
    document.createTextNode(textarea.value.slice(0, start)),
    startMarker,
    selectedText,
    endMarker,
    document.createTextNode(textarea.value.slice(end)),
  );
  const startRect = startMarker.getBoundingClientRect();
  const endRect = endMarker.getBoundingClientRect();
  if (!startRect.width && !startRect.height) return null;
  const visibleTop = Math.max(taRect.top, 0);
  const visibleBottom = Math.min(taRect.bottom, window.innerHeight);
  const visibleSelectionRects = Array.from(selectedText.getClientRects()).filter((rect) => (
    rect.bottom >= visibleTop
    && rect.top <= visibleBottom
    && rect.right >= taRect.left
    && rect.left <= taRect.right
  ));
  const anchorRect = textarea.selectionDirection === "backward"
    ? visibleSelectionRects[0]
    : visibleSelectionRects[visibleSelectionRects.length - 1];
  if (anchorRect) {
    return {
      left: anchorRect.left,
      top: anchorRect.top,
      bottom: anchorRect.bottom,
      height: anchorRect.height,
      width: anchorRect.width,
    };
  }
  return {
    left: startRect.left,
    top: startRect.top,
    bottom: startRect.bottom,
    height: startRect.height,
    width: Math.max(0, endRect.left - startRect.left),
  };
}

function hideSelectionToolbar() {
  if (selectionToolbarTimer !== null) {
    clearTimeout(selectionToolbarTimer);
    selectionToolbarTimer = null;
  }
  if (els.selectionToolbar) els.selectionToolbar.hidden = true;
  setSelectionPalette(null, false);
}

function showSelectionToolbar() {
  selectionToolbarTimer = null;
  const textarea = els.content;
  if (!textareaSelectionCanShowToolbar()) return;
  const measuredRect = measureSelectionInTextarea(textarea);
  const rect = measuredRect || (() => {
    const taRect = textarea.getBoundingClientRect();
    if (!taRect.width || !taRect.height) return null;
    return {
      left: taRect.left + 12,
      top: taRect.top + 12,
      bottom: taRect.top + 34,
      height: 22,
      width: Math.max(0, Math.min(180, taRect.width - 24)),
    };
  })();
  if (!rect) return;
  const toolbar = els.selectionToolbar;
  refreshSelectionToolbarColors();
  const useTouchToolbarLayout = window.matchMedia("(max-width: 1240px), (any-pointer: coarse) and (max-width: 1366px)").matches;
  if (useTouchToolbarLayout) {
    toolbar.style.maxWidth = `${Math.min(500, textarea.getBoundingClientRect().width)}px`;
  } else {
    toolbar.style.removeProperty("max-width");
  }
  toolbar.hidden = false;
  const toolbarWidth = toolbar.offsetWidth || 160;
  const toolbarHeight = toolbar.offsetHeight || 44;
  const visualViewport = window.visualViewport;
  const viewportLeft = visualViewport?.offsetLeft || 0;
  const viewportTop = visualViewport?.offsetTop || 0;
  const viewportWidth = visualViewport?.width || window.innerWidth;
  const viewportHeight = visualViewport?.height || window.innerHeight;
  const viewportRight = viewportLeft + viewportWidth;
  const viewportBottom = viewportTop + viewportHeight;
  let left = rect.left + rect.width / 2 - toolbarWidth / 2;
  left = Math.max(viewportLeft + 8, Math.min(left, viewportRight - toolbarWidth - 8));
  let top = rect.top - toolbarHeight - 8;
  if (top < viewportTop + 8) top = rect.bottom + 8;
  top = Math.max(viewportTop + 8, Math.min(top, viewportBottom - toolbarHeight - 8));
  toolbar.style.left = `${Math.round(left)}px`;
  toolbar.style.top = `${Math.round(top)}px`;
}

function scheduleSelectionToolbar() {
  // 打开颜色面板后，部分浏览器仍会补发一次 selectionchange。
  // 这不是新的选区；若在这里先隐藏工具栏，面板只会闪一下就被关掉。
  if (selectionPaletteIsOpen() && !els.selectionToolbar?.hidden) return;
  hideSelectionToolbar();
  if (!textareaSelectionCanShowToolbar()) return;
  selectionToolbarTimer = window.setTimeout(showSelectionToolbar, 140);
}

function rescheduleSelectionToolbar() {
  window.setTimeout(scheduleSelectionToolbar, 0);
}

function countFindMatches() {
  const needle = els.find.value;
  if (!needle) return 0;
  const haystack = els.content.value;
  let count = 0;
  let from = 0;
  for (;;) {
    const index = haystack.indexOf(needle, from);
    if (index === -1) break;
    count += 1;
    from = index + needle.length;
  }
  return count;
}

function updateFindMatchCount() {
  const countEl = els.findMatchCount;
  if (!countEl) return;
  const needle = els.find.value;
  if (!needle) {
    countEl.textContent = "";
    return;
  }
  const count = countFindMatches();
  countEl.textContent = count > 0 ? `找到 ${count} 处` : "没有匹配文本";
}

function findNext() {
  const needle = els.find.value;
  if (!needle) return;
  const haystack = els.content.value;
  const from = Math.max(els.content.selectionEnd, state.lastFindIndex + needle.length, 0);
  let index = haystack.indexOf(needle, from);
  let wrapped = false;
  if (index === -1) {
    index = haystack.indexOf(needle, 0);
    wrapped = index !== -1;
  }
  updateFindMatchCount();
  if (index === -1) {
    els.status.textContent = "没有找到匹配文本";
    return;
  }
  state.lastFindIndex = index;
  els.content.focus();
  els.content.setSelectionRange(index, index + needle.length);
  const count = countFindMatches();
  els.status.textContent = wrapped
    ? `已循环到开头：第 ${index + 1} 个字符处（共 ${count} 处）`
    : `已选中第 ${index + 1} 个字符处（共 ${count} 处）`;
}

function replaceCurrent() {
  const needle = els.find.value;
  if (!needle) return;
  let start = els.content.selectionStart;
  let end = els.content.selectionEnd;
  let selected = els.content.value.slice(start, end);
  if (selected !== needle) {
    findNext();
    start = els.content.selectionStart;
    end = els.content.selectionEnd;
    selected = els.content.value.slice(start, end);
    if (selected !== needle) return;
  }
  insertAtSelection(els.content, els.replace.value);
  state.lastFindIndex = start;
  els.status.textContent = "已替换当前匹配";
  findNext();
}

function replaceAll() {
  const needle = els.find.value;
  if (!needle) return;
  const replacement = els.replace.value;
  const pieces = els.content.value.split(needle);
  const count = pieces.length - 1;
  if (count < 1) {
    updateFindMatchCount();
    els.status.textContent = "没有找到匹配文本";
    return;
  }
  commitTextHistory();
  els.content.value = pieces.join(replacement);
  els.content.focus();
  els.content.setSelectionRange(0, 0);
  commitTextHistory();
  state.lastFindIndex = -1;
  updateFindMatchCount();
  els.status.textContent = `已替换 ${count} 处`;
  requestRender();
}

async function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function openLiveMediaDatabase() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("当前浏览器不支持保存视频素材。"));
      return;
    }
    const request = window.indexedDB.open(LIVE_MEDIA_DB, 2);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(LIVE_MEDIA_STORE)) {
        database.createObjectStore(LIVE_MEDIA_STORE);
      }
      if (!database.objectStoreNames.contains(IMAGE_MEDIA_STORE)) {
        database.createObjectStore(IMAGE_MEDIA_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("视频素材数据库无法打开。"));
  });
}

async function writeLiveMediaBlob(key, blob) {
  const database = await openLiveMediaDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(LIVE_MEDIA_STORE, "readwrite");
      transaction.objectStore(LIVE_MEDIA_STORE).put(blob, key);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error("视频素材保存失败。"));
      transaction.onabort = () => reject(transaction.error || new Error("视频素材保存已取消。"));
    });
  } finally {
    database.close();
  }
}

async function readLiveMediaBlob(key) {
  const database = await openLiveMediaDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(LIVE_MEDIA_STORE, "readonly");
      const request = transaction.objectStore(LIVE_MEDIA_STORE).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("视频素材读取失败。"));
    });
  } finally {
    database.close();
  }
}

async function deleteLiveMediaBlob(key) {
  const database = await openLiveMediaDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(LIVE_MEDIA_STORE, "readwrite");
      transaction.objectStore(LIVE_MEDIA_STORE).delete(key);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error("视频素材删除失败。"));
    });
  } finally {
    database.close();
  }
}

// 图片的 base64 会把 localStorage 顶爆（单张手机照片约 1.5MB，配额只有 5MB），
// 所以正文只在 localStorage 留元数据，画面本体和实况视频一样放 IndexedDB。
async function writeImageSource(key, src) {
  const database = await openLiveMediaDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(IMAGE_MEDIA_STORE, "readwrite");
      transaction.objectStore(IMAGE_MEDIA_STORE).put(src, key);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error("图片素材保存失败。"));
      transaction.onabort = () => reject(transaction.error || new Error("图片素材保存已取消。"));
    });
  } finally {
    database.close();
  }
}

async function readImageSource(key) {
  const database = await openLiveMediaDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(IMAGE_MEDIA_STORE, "readonly");
      const request = transaction.objectStore(IMAGE_MEDIA_STORE).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("图片素材读取失败。"));
    });
  } finally {
    database.close();
  }
}

function imageSourceKey(projectId, imageId) {
  return `${projectId || "current"}::${imageId}`;
}

/** 只有内容图会外置；示例图和 http 图保持原样，避免给内置说明书也建索引。 */
function isExternalizableImageSource(src) {
  return typeof src === "string" && src.startsWith("data:") && src.length > 4096;
}

/** 写入前把 images[].src 换成占位，交给 IndexedDB 保存，localStorage 只留元数据。 */
function withExternalizedImages(data, projectId) {
  const images = data?.images;
  if (!images || typeof images !== "object") return data;
  let changed = false;
  const nextImages = {};
  for (const [id, image] of Object.entries(images)) {
    if (image && typeof image === "object" && isExternalizableImageSource(image.src)) {
      const { src, ...rest } = image;
      nextImages[id] = { ...rest, src: "", srcKey: imageSourceKey(projectId, id) };
      changed = true;
      void writeImageSource(imageSourceKey(projectId, id), src).catch(() => undefined);
    } else {
      nextImages[id] = image;
    }
  }
  return changed ? { ...data, images: nextImages } : data;
}

/** 读回时把外置的画面填回内存，渲染和云端上传都仍然拿得到 src。 */
async function hydrateImageSourcesForState() {
  const pending = Object.entries(state.images).filter(
    ([, image]) => image && typeof image === "object" && !image.src && image.srcKey,
  );
  if (!pending.length) return;
  await Promise.all(
    pending.map(async ([, image]) => {
      try {
        const src = await readImageSource(image.srcKey);
        if (src) image.src = src;
      } catch {
        // 画面丢失时保持占位，导出会提示重新上传。
      }
    }),
  );
}

function replaceLiveMediaCache(key, blob, name = "video.mov") {
  const previous = liveMediaFiles.get(key);
  if (previous?.url) URL.revokeObjectURL(previous.url);
  const url = URL.createObjectURL(blob);
  const cached = { blob, url, name: name || "video.mov", type: blob.type || "video/quicktime" };
  liveMediaFiles.set(key, cached);
  return cached;
}

async function hydrateLiveMediaForState() {
  const liveImages = Object.entries(state.images).filter(([, image]) => image?.kind === "live");
  await Promise.all(
    liveImages.map(async ([id, image]) => {
      if (image.previewVideoSrc) return;
      const key = String(image.videoKey || id);
      if (liveMediaFiles.has(key)) return;
      try {
        const blob = await readLiveMediaBlob(key);
        if (blob) replaceLiveMediaCache(key, blob, image.videoName || "video.mov");
      } catch {
        // Keep the saved cover visible. Export will explain that the source video is missing.
      }
    }),
  );
}

function portableMediaExtension(blob, name, video = false) {
  const byType = {
    "image/gif": "gif", "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp",
    "image/avif": "avif", "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm",
  };
  return byType[blob.type] || String(name || "").match(video ? /\.(mov|mp4|m4v|webm)$/i : /\.(gif|png|jpe?g|webp|avif)$/i)?.[1]?.toLowerCase() || "bin";
}

async function portableCloudBlob(path, label) {
  try {
    return await cloudApi().downloadProjectAsset(path);
  } catch (error) {
    throw new Error(`${label} 读取失败：${error?.message || "请稍后重试。"}`);
  }
}

async function portableCoverBlob(image) {
  const src = image.src || (image.srcKey ? await readImageSource(image.srcKey) : "");
  if (src) {
    try {
      const response = await fetch(src);
      if (response.ok) return await response.blob();
    } catch {
      // An expired blob URL may still have a cloud backup.
    }
  }
  if (image.storagePath && cloudApi()?.downloadProjectAsset) {
    return portableCloudBlob(image.storagePath, `图片/GIF ${image.name || "未命名素材"}`);
  }
  throw new Error(`图片或 GIF 原件缺失：${image.name || "未命名素材"}`);
}

async function portableVideoBlob(image, id) {
  const key = String(image.videoKey || id);
  const local = liveMediaFiles.get(key)?.blob || await readLiveMediaBlob(key).catch(() => null);
  if (local) return local;
  if (image.videoStoragePath && cloudApi()?.downloadProjectAsset) {
    return portableCloudBlob(image.videoStoragePath, `实况原视频 ${image.videoName || image.name || id}`);
  }
  throw new Error(`实况原视频缺失：${image.videoName || image.name || id}`);
}

function portableProjectMigrationUnits(project) {
  return 1 + Object.values(project.data?.images || {}).reduce((count, image) => {
    if (!image || typeof image !== "object") return count;
    return count + (image.kind === "live" ? 2 : 1);
  }, 0);
}

async function writePortableProject(project, writeFile, fromCloud = false, onProgress = null) {
  if (fromCloud && !cloudIsReady()) throw new Error("账号连接已断开，请重新登录后再迁移。");
  const migrationUserId = fromCloud ? cloudState.user.id : "";
  if (!project || isBuiltInProject(project)) throw new Error("请先新建并编辑自己的稿件，再保存原稿。");
  const copy = JSON.parse(JSON.stringify(project));
  copy.createdAt = projectCreatedAt(project);
  const media = [];
  const readablePaths = new Map();
  for (const [index, [id, image]] of Object.entries(project.data?.images || {}).entries()) {
    if (!image || typeof image !== "object") continue;
    if (fromCloud && cloudState.user?.id !== migrationUserId) throw new Error("账号已切换，请重新选择旧稿。");
    onProgress?.({ type: "reading", label: `图片/GIF「${image.name || id}」` });
    const cover = fromCloud && image.storagePath
      ? await portableCloudBlob(image.storagePath, `图片/GIF ${image.name || id}`)
      : await portableCoverBlob(image);
    const stem = String(index + 1).padStart(3, "0");
    const coverPath = `media/${stem}.${portableMediaExtension(cover, image.name)}`;
    await writeFile(coverPath, cover);
    onProgress?.({ type: "written", label: `图片/GIF「${image.name || id}」` });
    media.push({ path: coverPath, size: cover.size, type: cover.type || "application/octet-stream" });
    readablePaths.set(id, coverPath);
    const saved = copy.data.images[id];
    saved.src = "";
    delete saved.srcKey;
    delete saved.storagePath;
    saved.portableSrcPath = coverPath;
    if (image.kind === "live") {
      onProgress?.({ type: "reading", label: `实况原视频「${image.videoName || id}」` });
      const video = fromCloud && image.videoStoragePath
        ? await portableCloudBlob(image.videoStoragePath, `实况原视频 ${image.videoName || id}`)
        : await portableVideoBlob(image, id);
      const videoPath = `media/${stem}-video.${portableMediaExtension(video, image.videoName, true)}`;
      await writeFile(videoPath, video);
      onProgress?.({ type: "written", label: `实况原视频「${image.videoName || id}」` });
      media.push({ path: videoPath, size: video.size, type: video.type || "application/octet-stream" });
      delete saved.videoStoragePath;
      delete saved.previewVideoSrc;
      saved.portableVideoPath = videoPath;
    }
  }
  const markdown = String(project.data.content || "").replace(/\[\[image:([^\]]+)\]\]/g, (marker, id) => {
    const path = readablePaths.get(id);
    return path ? `![${project.data.images[id]?.name || "图片"}](${path})` : marker;
  });
  await writeFile("content.md", markdown);
  await writeFile("project.json", JSON.stringify(copy));
  if (fromCloud && cloudState.user?.id !== migrationUserId) throw new Error("账号已切换，请重新选择旧稿。");
  onProgress?.({ type: "reading", label: "原稿内容与清单" });
  // 清单最后写入；缺少清单的文件夹不会被识别成完整原稿。
  await writeFile("manifest.json", JSON.stringify({ format: "write-then-publish", version: 1, media }));
  onProgress?.({ type: "written", label: "原稿内容与清单" });
}

async function exportPortableProject(selectedProject = null) {
  closeAccountMenu();
  if (els.downloadMenu) els.downloadMenu.open = false;
  if (!selectedProject) saveState();
  const project = selectedProject || state.projects.find((item) => item.id === state.currentProjectId);
  if (!project || isBuiltInProject(project)) throw new Error("请先新建并编辑自己的稿件，再保存原稿。");
  if (!window.JSZip) throw new Error("ZIP 组件未加载，请刷新页面后重试。");
  const folderName = projectFolderName(project);
  const zip = new window.JSZip();
  const folder = zip.folder(folderName);
  els.status.textContent = "正在整理原稿与素材…";
  await writePortableProject(project, (path, data) => folder.file(path, data), Boolean(selectedProject));
  const blob = await zip.generateAsync({ type: "blob", compression: "STORE", streamFiles: true });
  await saveBlob(blob, `${folderName}.zip`);
  els.status.textContent = `已交给浏览器下载 ${folderName}.zip；请检查下载目录并保留原稿。`;
}

/** 把当前稿件连同图片、GIF、实况视频存进项目的 drafts/<图文|长文>/<标题>/；只在本机 server.py 下可用。 */
async function saveProjectToFolderDrafts() {
  closeAccountMenu();
  if (els.downloadMenu) els.downloadMenu.open = false;
  if (!folderDraftsSupported()) throw new Error("保存到项目需要在本机运行 python3 server.py 后打开页面。");
  saveState();
  const project = state.projects.find((item) => item.id === state.currentProjectId);
  if (!project || isBuiltInProject(project)) throw new Error("请先新建并编辑自己的稿件，再保存到项目。");
  els.status.textContent = "正在保存到项目 drafts/…";
  const result = await ensureFolderDraftForProject(project);
  if (!result) throw new Error("没连上本机 server.py，未保存到项目。");
  if (result.error) throw new Error(`未能保存到项目：${result.error}`);
  const note = result.note ? `（${result.note}）` : "";
  els.status.textContent = `${result.created ? "已保存到项目" : "已同步到项目"} drafts/${result.file}${note}`;
}

async function inspectPortableProject(read, paths) {
  const manifest = JSON.parse(await (await read("manifest.json")).text());
  if (manifest?.format !== "write-then-publish" || manifest.version !== 1 || !Array.isArray(manifest.media)) {
    throw new Error("这不是受支持的写了就发原稿文件夹。");
  }
  const source = JSON.parse(await (await read("project.json")).text());
  if (!source?.data || typeof source.data.content !== "string" || !source.data.images
    || typeof source.data.images !== "object" || Array.isArray(source.data.images)) {
    throw new Error("原稿编辑数据不完整。");
  }
  const listed = new Map();
  for (const item of manifest.media) {
    if (!/^media\/[a-zA-Z0-9_.-]+$/.test(item?.path) || !Number.isSafeInteger(item.size) || item.size < 1 || listed.has(item.path)) {
      throw new Error("原稿素材清单无效。");
    }
    listed.set(item.path, item);
  }
  if (listed.size > 500 || paths.length > 510) throw new Error("原稿文件数量异常，请检查文件夹。");
  for (const path of listed.keys()) {
    if (!paths.includes(path)) throw new Error(`文件缺失：${path}`);
  }
  for (const [id, image] of Object.entries(source.data.images)) {
    if (["__proto__", "constructor", "prototype"].includes(id) || !image || typeof image !== "object") {
      throw new Error("原稿图片数据无效。");
    }
    if (!listed.has(image.portableSrcPath)) throw new Error(`素材缺失：${image.name || id}`);
    if (image.kind === "live" && !listed.has(image.portableVideoPath)) {
      throw new Error(`实况原视频缺失：${image.videoName || id}`);
    }
  }
  for (const item of listed.values()) {
    const file = await read(item.path);
    if (file.size !== item.size) throw new Error(`素材大小不符：${item.path}`);
  }
  return { read, source, listed };
}

async function importPortableProject({ read, source, listed }) {
  if (activeStorageScope !== "guest" && state.projects.length >= MAX_PROJECTS) {
    throw new Error(`这台设备已有 ${MAX_PROJECTS} 篇稿件，请先备份并整理旧稿，再导入。`);
  }
  const imported = createProject(source.data);
  imported.title = String(source.title || imported.title).slice(0, 200);
  imported.createdAtUnknown = projectCreatedAt(source) === null;
  imported.createdAt = projectCreatedAt(source);
  for (const [id, image] of Object.entries(source.data.images)) {
    const coverInfo = listed.get(image.portableSrcPath);
    const cover = await read(coverInfo.path);
    if (cover.size !== coverInfo.size) throw new Error(`素材大小不符：${image.name || id}`);
    const coverBlob = new Blob([cover], { type: coverInfo.type || cover.type });
    const src = await readFileAsDataURL(coverBlob);
    const key = imageSourceKey(imported.id, id);
    await writeImageSource(key, src);
    const restored = { ...imported.data.images[id], src, srcKey: key };
    delete restored.portableSrcPath;
    delete restored.storagePath;
    if (image.kind === "live") {
      const videoInfo = listed.get(image.portableVideoPath);
      const video = await read(videoInfo.path);
      if (video.size !== videoInfo.size) throw new Error(`原视频大小不符：${image.videoName || id}`);
      const videoBlob = new Blob([video], { type: videoInfo.type || video.type });
      const videoKey = `${imported.id}::${id}::video`;
      await writeLiveMediaBlob(videoKey, videoBlob);
      replaceLiveMediaCache(videoKey, videoBlob, image.videoName || "video.mov");
      restored.videoKey = videoKey;
      delete restored.portableVideoPath;
      delete restored.videoStoragePath;
      delete restored.previewVideoSrc;
    }
    imported.data.images[id] = restored;
  }
  saveState();
  state.projects = [imported, ...state.projects.filter((item) => !isBuiltInProject(item))].slice(0, MAX_PROJECTS);
  state.currentProjectId = imported.id;
  applyForm(imported.data);
  syncGuideReadOnlyMode();
  resetTextHistory();
  saveProjectStore();
  updateProjectHistory();
  await render();
  els.status.textContent = `已导入原稿：${imported.title}`;
}

async function inspectPortableZip(file) {
  if (!window.JSZip || !file) throw new Error("ZIP 组件未加载，请刷新页面后重试。");
  if (file.size > 1024 * 1024 * 1024) throw new Error("ZIP 超过 1 GB，请选择迁移时生成的单个 ZIP 包。");
  const zip = await window.JSZip.loadAsync(file, { checkCRC32: true });
  const paths = Object.keys(zip.files).filter((path) => !zip.files[path].dir);
  const manifests = paths.filter((path) => /(?:^|\/)manifest\.json$/.test(path) && !path.startsWith("__MACOSX/"));
  if (!manifests.length || manifests.length > 200) throw new Error("ZIP 中没有可编辑原稿，或稿件数量超过 200 篇。");
  const options = [];
  for (const manifest of manifests) {
    const root = manifest.slice(0, -"manifest.json".length);
    if (root.split("/").some((part) => part === "..")) throw new Error("原稿文件路径无效。");
    const candidate = await inspectPortableProject(async (path) => {
      const entry = zip.file(root + path);
      if (!entry) throw new Error(`文件缺失：${path}`);
      return entry.async("blob");
    }, paths.filter((path) => path.startsWith(root)).map((path) => path.slice(root.length)));
    options.push({ candidate, name: root.split("/").filter(Boolean).at(-1) || file.name || "原稿" });
  }
  return options.length === 1 ? options[0].candidate : options;
}

async function inspectPortableFolder(files) {
  const selected = Array.from(files || [], (entry) => entry.file ? entry : { file: entry, path: entry.webkitRelativePath });
  const manifests = selected.filter((entry) => /(?:^|\/)manifest\.json$/.test(entry.path));
  if (!manifests.length) throw new Error("所选文件夹里没有可编辑原稿，请选择迁移总文件夹或其中一个日期文件夹。");
  if (manifests.length > 200) throw new Error("原稿数量过多，请分批选择日期文件夹。");
  const options = [];
  for (const manifest of manifests) {
    const root = manifest.path.slice(0, -"manifest.json".length);
    const scoped = selected.filter((entry) => entry.path.startsWith(root));
    const entries = new Map(scoped.map((entry) => [entry.path.slice(root.length), entry.file]));
    const candidate = await inspectPortableProject(async (path) => {
      const file = entries.get(path);
      if (!file) throw new Error(`文件缺失：${path}`);
      return file;
    }, [...entries.keys()]);
    const folderName = root.split("/").filter(Boolean).at(-1) || "原稿";
    options.push({ candidate, name: folderName });
  }
  options.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  return options.length === 1 ? options[0].candidate : options;
}

function isMarkdownFile(file) {
  return /\.(md|markdown)$/i.test(file?.name || "");
}

/** 和 server.py 的 split_front_matter 一致：只取 title，其余 front matter 丢掉。 */
function splitMarkdownFrontMatter(text) {
  const match = /^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(text);
  if (!match) return { title: "", body: text };
  let title = "";
  for (const line of match[1].split("\n")) {
    const [key, ...rest] = line.split(":");
    if (key.trim().toLowerCase() !== "title" || !rest.length) continue;
    title = rest.join(":").trim();
    if (title.startsWith("\"")) {
      try {
        title = String(JSON.parse(title));
      } catch {
        title = title.replace(/^"+|"+$/g, "");
      }
    }
    title = title.replace(/^'+|'+$/g, "");
  }
  return { title, body: text.slice(match[0].length).replace(/^\n+/, "") };
}

/** 单篇 Markdown，可连同文中引用的图片一起选；图片按路径或文件名对上 ![](…) / ![[…]]。 */
async function inspectMarkdownImport(files) {
  const selected = Array.from(files || []);
  const markdownFiles = selected.filter(isMarkdownFile);
  if (markdownFiles.length !== 1) throw new Error("请只选择一篇 .md 文件，可同时多选它引用的图片。");
  const [file] = markdownFiles;
  if (file.size > 5 * 1024 * 1024) throw new Error("Markdown 文件超过 5 MB，请检查是否选错文件。");
  const text = (await file.text()).replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const { title, body } = splitMarkdownFrontMatter(text);
  const imageFiles = selected.filter(isImageFile);
  const placeholders = Object.fromEntries(imageFiles.map((image, index) => [String(index), { name: image.name, sourcePath: image.name }]));
  const converted = convertObsidianImageReferences(body, placeholders);
  const used = new Set(Array.from(converted.content.matchAll(/\[\[image:(\d+)\]\]/g), (match) => match[1]));
  return {
    markdown: true,
    body,
    imageFiles: imageFiles.filter((_, index) => used.has(String(index))),
    references: extractMarkdownImageReferences(body).length,
    // 网络图片本来就不需要本地文件，不算“未对上”。
    unresolved: converted.unresolved.filter((item) => !/：https?:\/\//i.test(item)),
    // 没写 front matter 标题时留空，和新建稿一样用正文第一行当标题。
    source: { title: title.slice(0, 200) },
    displayTitle: title || projectTitleFromData({ content: body }) || file.name,
  };
}

async function importMarkdownProject({ body, imageFiles, source }) {
  if (activeStorageScope !== "guest" && state.projects.length >= MAX_PROJECTS) {
    throw new Error(`这台设备已有 ${MAX_PROJECTS} 篇稿件，请先备份并整理旧稿，再导入。`);
  }
  const images = {};
  for (const [index, file] of imageFiles.entries()) {
    images[createImportedImageId(index)] = {
      src: await readFileAsDataURL(file),
      name: file.name || "图片",
      sourcePath: file.name || "图片",
      vaultPath: null,
      crop: null,
      layout: defaultNewImageLayout(),
    };
  }
  const content = convertObsidianImageReferences(body, images).content;
  saveState();
  const imported = createProject({ ...blankFormState(), appMode: state.appMode, title: source.title, content, images });
  state.projects = [imported, ...state.projects.filter((item) => !isBuiltInProject(item))].slice(0, MAX_PROJECTS);
  state.currentProjectId = imported.id;
  applyForm(imported.data);
  syncGuideReadOnlyMode();
  resetTextHistory();
  saveProjectStore();
  updateProjectHistory();
  await render();
  els.status.textContent = `已导入 Markdown：${imported.title}`;
}

function recordImportedMigrationZip(loaded, fileName, userId) {
  if (!ACCOUNT_MAINTENANCE || !userId || cloudState.user?.id !== userId || cloudState.legacyProjectsStatus !== "ready") return 0;
  const projects = new Map(cloudState.legacyProjects.map((project) => [project.id, project]));
  const options = Array.isArray(loaded) ? loaded : [{ candidate: loaded }];
  const matched = new Set();
  for (const { candidate } of options) {
    const original = projects.get(candidate.source?.id);
    if (!original || original.updatedAt !== Number(candidate.source.updatedAt)) continue;
    recordMigrationReceipt(original, fileName);
    matched.add(original.id);
  }
  if (matched.size) {
    renderCloudMigrationList();
    updateCloudMigrationStatus();
    updateMigrationTestUi();
  }
  return matched.size;
}

function setPortableImportStatus(message, error = false) {
  els.portableImportStatus.textContent = message;
  els.portableImportStatus.classList.toggle("is-error", error);
}

function openPortableImportModal() {
  closeAccountMenu();
  if (els.downloadMenu) els.downloadMenu.open = false;
  portableImportReturnFocus = document.activeElement;
  portableImportCandidate = null;
  portableImportOptions = [];
  portableImportSelectionId += 1;
  els.portableImportChoice.hidden = true;
  els.portableImportPreview.hidden = true;
  els.portableImportConfirm.disabled = true;
  els.portableImportWarning.textContent = "导入后会新增到原稿列表，不会覆盖当前稿。";
  setPortableImportStatus("选择可编辑原稿 ZIP、迁移 ZIP 或一篇 Markdown；Markdown 可同时多选它引用的图片。");
  els.portableImportModal.classList.remove("hidden");
  setDialogBackgroundInert(true);
  requestAnimationFrame(() => els.portableImportZip.focus());
}

function closePortableImportModal() {
  if (portableImportApplying) return;
  portableImportSelectionId += 1;
  portableImportCandidate = null;
  portableImportOptions = [];
  els.portableImportModal.classList.add("hidden");
  els.portableImportDropzone.classList.remove("is-dragging");
  setDialogBackgroundInert(false);
  const returnFocus = portableImportReturnFocus;
  portableImportReturnFocus = null;
  if (returnFocus instanceof HTMLElement) requestAnimationFrame(() => returnFocus.focus());
}

function selectPortableImportOption(index) {
  const option = portableImportOptions[index];
  if (!option) return;
  portableImportCandidate = option.candidate;
  if (option.candidate.markdown) {
    const { references, imageFiles, unresolved } = option.candidate;
    els.portableImportName.textContent = option.candidate.displayTitle;
    els.portableImportDetails.textContent = `Markdown 正文 ✓ · 引用图片 ${references} · 已对上 ${imageFiles.length}`
      + (unresolved.length ? ` · ${unresolved.length} 张保留原引用（${unresolved.slice(0, 3).join("、")}）` : "");
    els.portableImportPreview.hidden = false;
    els.portableImportConfirm.disabled = false;
    return;
  }
  const images = Object.values(option.candidate.source.data.images);
  const gifs = Array.from(option.candidate.listed.values()).filter((item) => item.type === "image/gif" || /\.gif$/i.test(item.path)).length;
  const videos = images.filter((image) => image.kind === "live").length;
  els.portableImportName.textContent = option.candidate.source.title || option.name || "未命名原稿";
  els.portableImportDetails.textContent = `正文与编辑数据 ✓ · 图片 ${images.length} · GIF 原文件 ${gifs} · 实况原视频 ${videos}`;
  els.portableImportPreview.hidden = false;
  els.portableImportConfirm.disabled = false;
}

async function previewPortableImport(load, name, verifyZip = false) {
  const selectionId = ++portableImportSelectionId;
  const userId = cloudState.user?.id;
  portableImportCandidate = null;
  portableImportOptions = [];
  els.portableImportChoice.hidden = true;
  els.portableImportPreview.hidden = true;
  els.portableImportConfirm.disabled = true;
  setPortableImportStatus("正在检查原稿和素材…");
  try {
    const loaded = await load();
    if (selectionId !== portableImportSelectionId) return;
    const confirmed = verifyZip ? recordImportedMigrationZip(loaded, name, userId) : 0;
    portableImportOptions = Array.isArray(loaded) ? loaded : [{ candidate: loaded, name }];
    if (!portableImportOptions.length) throw new Error("没有找到可导入的原稿。");
    els.portableImportChoiceSelect.replaceChildren();
    if (portableImportOptions.length > 1) {
      for (const [index, option] of portableImportOptions.entries()) {
        const item = document.createElement("option");
        item.value = String(index);
        item.textContent = `${option.name} · ${option.candidate.source.title || "未命名原稿"}`;
        els.portableImportChoiceSelect.append(item);
      }
      els.portableImportChoice.hidden = false;
    }
    selectPortableImportOption(0);
    const status = portableImportOptions.length > 1
      ? `找到 ${portableImportOptions.length} 篇完整原稿，请选一篇继续编辑。`
      : "文件结构和素材大小已检查，可以打开编辑。";
    setPortableImportStatus(confirmed ? `${status} 其中 ${confirmed} 篇旧稿已核对保存。` : status);
  } catch (error) {
    if (selectionId !== portableImportSelectionId) return;
    setPortableImportStatus(error?.message || "原稿检查失败。", true);
  }
}

async function filesFromDroppedEntry(entry, prefix = "", files = []) {
  if (files.length > 10000) throw new Error("原稿文件数量异常，请分批选择日期文件夹。");
  const path = `${prefix}${entry.name}`;
  if (entry.isFile) {
    const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
    files.push({ path, file });
    return files;
  }
  const reader = entry.createReader();
  for (;;) {
    const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
    if (!batch.length) break;
    for (const child of batch) await filesFromDroppedEntry(child, `${path}/`, files);
  }
  return files;
}

async function handlePortableImportDrop(event) {
  event.preventDefault();
  els.portableImportDropzone.classList.remove("is-dragging");
  const files = Array.from(event.dataTransfer?.files || []);
  if (files.length === 1 && /\.zip$/i.test(files[0].name)) {
    await previewPortableImport(() => inspectPortableZip(files[0]), files[0].name, true);
    return;
  }
  if (files.some(isMarkdownFile)) {
    await previewPortableImport(() => inspectMarkdownImport(files), files.find(isMarkdownFile).name);
    return;
  }
  setPortableImportStatus("请拖入一个原稿 ZIP、迁移 ZIP 或一篇 Markdown 文件。", true);
}

async function confirmPortableImport() {
  if (!portableImportCandidate || portableImportApplying) return;
  portableImportApplying = true;
  els.portableImportConfirm.disabled = true;
  setPortableImportStatus("正在导入原稿，请不要关闭页面…");
  try {
    if (portableImportCandidate.markdown) await importMarkdownProject(portableImportCandidate);
    else await importPortableProject(portableImportCandidate);
    portableImportApplying = false;
    closePortableImportModal();
  } catch (error) {
    setPortableImportStatus(error?.message || "导入失败，当前稿未替换。", true);
    els.portableImportConfirm.disabled = false;
  } finally {
    portableImportApplying = false;
  }
}

async function runPortableAction(button, action) {
  if (button) button.disabled = true;
  try {
    await action();
  } catch (error) {
    const message = error?.message || "原稿处理失败，请重试。";
    els.status.textContent = message;
    window.alert(message);
  } finally {
    if (button) button.disabled = false;
  }
}

function renderCloudMigrationList() {
  if (!els.cloudMigrationList) return;
  els.cloudMigrationList.replaceChildren();
  if (cloudState.legacyProjectsStatus !== "ready") {
    const message = document.createElement("p");
    message.textContent = cloudState.legacyProjectsStatus === "error"
      ? "旧稿清单读取失败，请点击「刷新清单」重试。"
      : "正在读取旧稿清单…";
    els.cloudMigrationList.append(message);
    return;
  }
  if (!cloudState.legacyProjects.length) {
    const empty = document.createElement("p");
    empty.textContent = "没有查到这个账号的云端旧稿。";
    els.cloudMigrationList.append(empty);
    return;
  }
  for (const project of cloudState.legacyProjects) {
    const row = document.createElement("article");
    row.className = "cloud-migration-row";
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = project.title || "未命名图文";
    const detail = document.createElement("small");
    const createdAt = projectCreatedAt(project);
    detail.textContent = createdAt ? new Date(createdAt).toLocaleDateString("zh-CN") : "创建时间未知";
    copy.append(title, detail);
    row.dataset.cloudProjectId = project.id;
    const result = document.createElement("span");
    result.className = "cloud-migration-result";
    const receipt = migrationReceiptFor(project);
    const incomplete = receipt?.state === "incomplete";
    const packaged = receipt?.state === "packaged";
    const written = receipt?.state === "written";
    const saved = receipt && !incomplete && !packaged && !written;
    result.textContent = incomplete
      ? (/object not found/i.test(receipt.error || "") ? "素材缺失" : "未完成")
      : saved ? "已核对保存" : written ? "已保存到文件夹" : packaged ? "已打包待确认" : "待迁移";
    if (incomplete) result.title = receipt.error || "请重新迁移这一篇";
    if (written) result.title = `${receipt.folderName || "所选文件夹"}/${receipt.archiveName || "ZIP"}，建议导入抽查`;
    row.classList.toggle("is-saved", Boolean(saved || written));
    row.classList.toggle("is-incomplete", incomplete);
    row.append(copy, result);
    if (window.JSZip && incomplete) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "secondary-button";
      button.textContent = "重试这篇";
      button.disabled = cloudState.migrationBusy;
      button.dataset.cloudProjectId = project.id;
      row.append(button);
    }
    els.cloudMigrationList.append(row);
  }
}

function updateCloudMigrationStatus() {
  if (!els.cloudMigrationStatus) return;
  if (cloudState.legacyProjectsStatus === "loading") {
    els.cloudMigrationStatus.textContent = "正在读取旧稿…";
    return;
  }
  if (cloudState.legacyProjectsStatus === "error") {
    els.cloudMigrationStatus.textContent = "读取失败，请刷新清单。";
    return;
  }
  const total = cloudState.legacyProjects.length;
  const saved = savedMigrationCount();
  const written = writtenMigrationCount();
  const incomplete = incompleteMigrationCount();
  const packaged = packagedMigrationCount();
  const unknown = total - saved - written - incomplete - packaged;
  if (!total) {
    els.cloudMigrationStatus.textContent = "这个账号暂无云端旧稿。";
  } else {
    els.cloudMigrationStatus.textContent = `${total} 篇旧稿 · 已核对 ${saved} 篇${written ? ` · 已保存到文件夹 ${written} 篇` : ""}${packaged ? ` · 已打包待确认 ${packaged} 篇` : ""}${incomplete ? ` · 未完成 ${incomplete} 篇` : ""}${unknown ? ` · 待迁移 ${unknown} 篇` : ""}`;
  }
}

function updateMigrationAllButton() {
  if (!els.cloudMigrationAll) return;
  const supported = Boolean(window.JSZip);
  const total = cloudState.legacyProjects.length;
  els.cloudMigrationAll.disabled = !supported || !cloudIsReady() || cloudState.legacyProjectsStatus !== "ready" || !total || cloudState.migrationBusy;
  if (els.cloudMigrationAllLabel) els.cloudMigrationAllLabel.textContent = total && savedMigrationCount() + writtenMigrationCount() === total
    ? "再次保存全部 ZIP" : "一键迁移为 ZIP";
  els.cloudMigrationAll.title = supported ? "" : "ZIP 组件未加载，请刷新页面";
  if (els.cloudMigrationBrowserDownload) els.cloudMigrationBrowserDownload.disabled = els.cloudMigrationAll.disabled;
}

function setMigrationBusy(busy) {
  cloudState.migrationBusy = busy;
  els.cloudMigrationRefresh.disabled = busy;
  els.cloudMigrationClose.disabled = busy;
  els.cloudMigrationList.querySelectorAll("button[data-cloud-project-id]").forEach((button) => { button.disabled = busy; });
  updateMigrationAllButton();
  updateMigrationTestUi();
  if (window.lucide) window.lucide.createIcons();
}

function updateMigrationProgress(processed, total, label, detail, running = true) {
  const percent = processed >= total ? 100 : Math.floor((processed / total) * 100);
  els.cloudMigrationProgress.hidden = false;
  els.cloudMigrationProgress.classList.toggle("is-running", running);
  els.cloudMigrationProgressLabel.textContent = label;
  els.cloudMigrationProgressPercent.textContent = `${percent}%`;
  els.cloudMigrationProgressTrack.setAttribute("aria-valuenow", String(percent));
  els.cloudMigrationProgressFill.style.width = `${percent}%`;
  els.cloudMigrationProgressDetail.textContent = detail;
}

async function writePortableFileToDirectory(directory, path, content) {
  const segments = path.split("/");
  const name = segments.pop();
  let target = directory;
  for (const segment of segments) target = await target.getDirectoryHandle(segment, { create: true });
  const fileHandle = await target.getFileHandle(name, { create: true });
  const stream = await fileHandle.createWritable();
  try {
    await stream.write(content);
    await stream.close();
  } catch (error) {
    if (typeof stream.abort === "function") await stream.abort().catch(() => {});
    throw error;
  }
  const expectedSize = content instanceof Blob ? content.size : new Blob([content]).size;
  const savedSize = (await fileHandle.getFile()).size;
  if (savedSize !== expectedSize) throw new Error(`${path} 写入后大小不符。`);
}

async function inspectPortableDirectory(directory) {
  const read = async (path) => {
    if (!/^(?:manifest\.json|project\.json|content\.md|media\/[a-zA-Z0-9_.-]+)$/.test(path)) {
      throw new Error(`原稿文件路径无效：${path}`);
    }
    const segments = path.split("/");
    const name = segments.pop();
    let target = directory;
    for (const segment of segments) target = await target.getDirectoryHandle(segment);
    return (await target.getFileHandle(name)).getFile();
  };
  const manifest = JSON.parse(await (await read("manifest.json")).text());
  await read("content.md");
  return inspectPortableProject(read, ["manifest.json", "project.json", "content.md", ...manifest.media.map((item) => item.path)]);
}

async function migrationFailuresFromSummary(files) {
  const entries = Array.from(files || [], (entry) => entry.file ? entry : { file: entry, path: entry.webkitRelativePath });
  const summary = entries.find((entry) => /^[^/]+\/迁移说明\.txt$/.test(entry.path));
  if (!summary) return [];
  const report = await summary.file.text();
  const failureSection = report.split(/\r?\n未完成：\r?\n/)[1];
  if (!failureSection) return [];
  const projects = [...cloudState.legacyProjects].sort((a, b) => b.title.length - a.title.length);
  const failures = [];
  for (const line of failureSection.split(/\r?\n/)) {
    const project = projects.find((item) => line.startsWith(`${item.title}：`)
      && projects.filter((other) => other.title === item.title).length === 1);
    if (project) failures.push({ project, reason: line.slice(project.title.length + 1) });
  }
  return failures;
}

async function verifySavedMigrationFolder(files) {
  if (cloudState.migrationBusy || !cloudIsReady() || cloudState.legacyProjectsStatus !== "ready") return;
  const userId = cloudState.user.id;
  setMigrationBusy(true);
  els.cloudMigrationStatus.textContent = "正在核对已保存原稿与素材…";
  try {
    const inspected = await inspectPortableFolder(files);
    if (cloudState.user?.id !== userId) throw new Error("账号已变化，请重新选择文件夹。");
    const rootName = files[0]?.webkitRelativePath?.split("/")[0] || "日期文件夹";
    const options = Array.isArray(inspected) ? inspected : [{ candidate: inspected, name: rootName }];
    const current = new Map(cloudState.legacyProjects.map((project) => [project.id, project]));
    let matched = 0;
    let unremembered = 0;
    for (const option of options) {
      const source = option.candidate.source;
      const project = current.get(source.id);
      if (!project || Number(source.updatedAt) !== project.updatedAt) continue;
      if (!recordMigrationReceipt(project, option.name)) unremembered += 1;
      matched += 1;
    }
    const failures = await migrationFailuresFromSummary(files);
    for (const { project, reason } of failures) recordMigrationFailure(project, reason);
    renderCloudMigrationList();
    updateMigrationAllButton();
    updateMigrationTestUi();
    const incomplete = incompleteMigrationCount();
    els.cloudMigrationStatus.textContent = matched || incomplete
      ? `已核对 ${matched} 篇完整原稿${incomplete ? `，另有 ${incomplete} 篇未完成` : ""}；当前共记录已保存 ${savedMigrationCount()}/${cloudState.legacyProjects.length} 篇。请再从左上角导入一篇试用。${unremembered ? "浏览器未能记住部分状态，请保留文件夹。" : ""}`
      : "所选文件夹与当前账号的云端旧稿不匹配，保存状态没有更改。";
  } catch (error) {
    els.cloudMigrationStatus.textContent = `核对未完成：${error?.message || "请重新选择迁移文件夹。"}`;
  } finally {
    setMigrationBusy(false);
  }
}

async function migrateAllCloudProjects({ browserDownload = false } = {}) {
  if (!ACCOUNT_MAINTENANCE || cloudState.migrationBusy || !cloudIsReady() || cloudState.legacyProjectsStatus !== "ready" || !cloudState.legacyProjects.length) return;
  if (!window.JSZip) { els.cloudMigrationStatus.textContent = "ZIP 组件未加载，请刷新页面。"; return; }
  const migrationUserId = cloudState.user.id;
  let directory = null;
  if (!browserDownload) {
    if (els.cloudMigrationBrowserDownload) els.cloudMigrationBrowserDownload.hidden = true;
    if (typeof window.showDirectoryPicker !== "function") {
      if (els.cloudMigrationBrowserDownload) els.cloudMigrationBrowserDownload.hidden = false;
      els.cloudMigrationStatus.textContent = "当前浏览器不支持选择保存文件夹。可点击「改用浏览器下载」；保存位置由浏览器设置决定。";
      return;
    }
    try {
      // 文件夹选择必须直接由这次点击触发，不能先等待读取云端旧稿。
      directory = await window.showDirectoryPicker({ id: "write-then-publish-migration", mode: "readwrite", startIn: "downloads" });
    } catch (error) {
      if (error?.name === "AbortError") {
        els.cloudMigrationStatus.textContent = "已取消选择文件夹，尚未开始迁移。";
      } else {
        if (els.cloudMigrationBrowserDownload) els.cloudMigrationBrowserDownload.hidden = false;
        els.cloudMigrationStatus.textContent = `无法选择文件夹：${error?.message || "浏览器拒绝访问"}。可重试，或点击「改用浏览器下载」。`;
      }
      return;
    }
  }
  if (cloudState.user?.id !== migrationUserId || !ACCOUNT_MAINTENANCE) {
    els.cloudMigrationStatus.textContent = "账号连接或迁移权限已变化，尚未开始迁移。";
    return;
  }
  if (els.cloudMigrationBrowserDownload) els.cloudMigrationBrowserDownload.hidden = true;
  const projects = [...cloudState.legacyProjects];
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const batchName = `写了就发旧稿-${stamp}`;
  const totalUnits = projects.reduce((count, project) => count + portableProjectMigrationUnits(project), 0) + 1;
  const nameCounts = new Map(), failed = [], archives = [];
  let zip = new window.JSZip(), queued = [], bytes = 0;
  let processed = 0, attempted = 0, completed = 0, unremembered = false;
  const assertAccount = () => {
    if (cloudState.user?.id !== migrationUserId || !ACCOUNT_MAINTENANCE) throw new Error("账号连接或迁移权限已变化，迁移已停止。");
  };
  const flush = async () => {
    if (!queued.length) return;
    assertAccount();
    const archiveName = `${batchName}-${String(archives.length + 1).padStart(2, "0")}.zip`;
    zip.file("迁移说明.txt", `写了就发旧稿迁移\n本包包含 ${queued.length} 篇完整原稿。\n${MIGRATION_DEADLINE_NOTICE}\n左上角「导入原稿」直接选择本 ZIP，再选一篇继续编辑。\n正文、排版、GIF 和原视频均保留；请从左上角导入并抽查。\n云端原件未删除。\n${failed.length ? `\n未完成：\n${failed.join("\n")}\n请在截止前重试；以页面最终结果为准。` : ""}\n`);
    const blob = await zip.generateAsync({ type: "blob", compression: "STORE", streamFiles: true }, (metadata) => {
      updateMigrationProgress(processed, totalUnits, "正在生成 ZIP…", `${archiveName} · 打包 ${Math.floor(metadata.percent)}%`);
    });
    assertAccount();
    if (directory) await writePortableFileToDirectory(directory, archiveName, blob);
    else await saveBlob(blob, archiveName);
    for (const { project } of queued) {
      const remembered = directory
        ? recordMigrationFolderSave(project, directory.name, archiveName)
        : recordMigrationPackage(project, archiveName);
      if (!remembered) unremembered = true;
    }
    completed += queued.length;
    archives.push(archiveName);
    zip = new window.JSZip(); queued = []; bytes = 0;
    renderCloudMigrationList();
    updateMigrationTestUi();
  };
  setMigrationBusy(true);
  updateMigrationProgress(0, totalUnits, "准备迁移 ZIP…", `已处理 0/${projects.length} 篇`);
  try {
    for (const [index, project] of projects.entries()) {
      assertAccount();
      const label = `第 ${index + 1}/${projects.length} 篇：${project.title || "未命名原稿"}`;
      const units = portableProjectMigrationUnits(project);
      let written = 0;
      const files = new Map();
      let size = 0;
      try {
        await writePortableProject(project, async (path, value) => {
          files.set(path, value instanceof Blob ? value : new Blob([value]));
        }, true, ({ type, label: mediaLabel }) => {
          if (type === "written") { written += 1; processed += 1; }
          updateMigrationProgress(processed, totalUnits, label, `${type === "reading" ? "正在读取" : "已整理"}${mediaLabel}`);
        });
        await inspectPortableProject(async (path) => files.get(path), [...files.keys()]);
        size = [...files.values()].reduce((sum, file) => sum + file.size, 0);
        if (size > 1000 * 1024 * 1024) throw new Error("单篇原稿超过 1 GB，暂时无法生成可导入的 ZIP，请联系作者处理。");
      } catch (error) {
        assertAccount();
        processed += units - written;
        const reason = error?.message || "素材整理失败";
        failed.push(`${project.title || project.id}：${reason}`);
        recordMigrationFailure(project, reason);
        attempted += 1;
        updateMigrationProgress(processed, totalUnits, label, `已处理 ${attempted}/${projects.length} 篇 · 未完成 ${failed.length} 篇`);
        continue;
      }
      // 每个分包都能单独导入；保存失败时中断整批，不能当作某篇缺少素材。
      if (bytes + size > 128 * 1024 * 1024) await flush();
      const baseName = projectFolderName(project);
      const count = (nameCounts.get(baseName) || 0) + 1;
      nameCounts.set(baseName, count);
      const folderName = count === 1 ? baseName : `${baseName}_${count}`;
      for (const [path, file] of files) zip.file(`${folderName}/${path}`, file);
      queued.push({ project }); bytes += size;
      attempted += 1;
      updateMigrationProgress(processed, totalUnits, label, `已处理 ${attempted}/${projects.length} 篇 · 未完成 ${failed.length} 篇`);
    }
    await flush();
    processed = totalUnits;
    const destination = directory ? `已保存到「${directory.name}」文件夹` : "已交给浏览器下载，请检查浏览器下载目录";
    els.cloudMigrationStatus.textContent = `已生成 ${archives.length} 个 ZIP，包含 ${completed}/${projects.length} 篇完整原稿。${failed.length ? `${failed.length} 篇未完成，请在截止前重试。` : ""}${archives.length ? `${destination}，再从左上角「导入原稿」试打开。` : "请检查未完成原因并重试。"}${unremembered ? "浏览器未能记住保存状态，请妥善保留 ZIP。" : ""}`;
    updateMigrationProgress(processed, totalUnits, failed.length ? "处理结束：部分原稿未完成" : "ZIP 迁移处理完成", `成功 ${completed} 篇 · 未完成 ${failed.length} 篇 · ${archives.length} 个 ZIP`, false);
  } catch (error) {
    for (const { project } of queued) recordMigrationFailure(project, error?.message || "ZIP 保存失败");
    els.cloudMigrationStatus.textContent = `迁移中断：${error?.message || "ZIP 保存失败"}。已有 ${completed} 篇${directory ? "写入所选文件夹" : "交给浏览器下载"}，请核对已有 ZIP 后重试。`;
    updateMigrationProgress(processed, totalUnits, "迁移中断", els.cloudMigrationStatus.textContent, false);
  } finally {
    renderCloudMigrationList();
    setMigrationBusy(false);
    els.status.textContent = els.cloudMigrationStatus.textContent;
  }
}

async function refreshCloudMigrationList() {
  if (!ACCOUNT_MAINTENANCE) {
    els.cloudMigrationStatus.textContent = "旧稿迁移期已结束，请从左上角导入已保存的 ZIP 原稿。";
    return;
  }
  if (cloudState.migrationBusy) return;
  if (!cloudIsReady()) {
    els.cloudMigrationStatus.textContent = "账号尚未连接，请登录旧账号后重试。";
    return;
  }
  const userId = cloudState.user.id;
  els.cloudMigrationRefresh.disabled = true;
  cloudState.legacyProjectsStatus = "loading";
  renderCloudMigrationList();
  updateMigrationAllButton();
  updateCloudMigrationStatus();
  updateMigrationTestUi();
  try {
    const rows = await cloudApi().listProjects();
    if (cloudState.user?.id !== userId) return;
    cloudState.legacyProjects = rows.map(cloudProjectFromRow).filter(Boolean);
    cloudState.legacyProjectsStatus = "ready";
  } catch (error) {
    if (cloudState.user?.id !== userId) return;
    cloudState.legacyProjectsStatus = "error";
    console.error(error);
  } finally {
    els.cloudMigrationRefresh.disabled = false;
    if (cloudState.user?.id === userId) {
      renderCloudMigrationList();
      updateMigrationAllButton();
      updateCloudMigrationStatus();
      updateMigrationTestUi();
      if (window.lucide) window.lucide.createIcons();
    }
  }
}

function openCloudMigrationModal() {
  closeAccountMenu();
  if (!cloudIsReady()) return;
  els.cloudMigrationModal.classList.remove("hidden");
  els.cloudMigrationProgress.hidden = true;
  if (els.cloudMigrationBrowserDownload) els.cloudMigrationBrowserDownload.hidden = true;
  renderCloudMigrationList();
  updateMigrationAllButton();
  updateCloudMigrationStatus();
  if (["idle", "error"].includes(cloudState.legacyProjectsStatus)) void refreshCloudMigrationList();
  els.cloudMigrationClose.focus();
}

function closeCloudMigrationModal() {
  if (cloudState.migrationBusy) return;
  els.cloudMigrationModal.classList.add("hidden");
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

const LIVE_PHOTO_DURATIONS = [3, 5, 8];
const LIVE_PHOTO_SPEEDS = [1, 1.5, 2, 3];

function normalizeLiveMediaSettings(settings = {}) {
  // 老数据只有 platform（小红书 5 秒 / 公众号 3 秒），按时长迁移过来。
  const legacyDuration = settings.platform === "wechat" ? 3 : 5;
  const duration = LIVE_PHOTO_DURATIONS.includes(Number(settings.duration))
    ? Number(settings.duration)
    : legacyDuration;
  const speed = LIVE_PHOTO_SPEEDS.includes(Number(settings.speed)) ? Number(settings.speed) : 1;
  const allowedAspects = ["free", "original", "1", "1.333333", "1.777778", "0.75", "0.5625"];
  const aspect = allowedAspects.includes(String(settings.aspect)) ? String(settings.aspect) : "original";
  const rawCrop = settings.crop && typeof settings.crop === "object" ? settings.crop : null;
  const crop = rawCrop
    ? {
        x: clamp(finiteNumber(rawCrop.x, 0), 0, 1),
        y: clamp(finiteNumber(rawCrop.y, 0), 0, 1),
        width: clamp(finiteNumber(rawCrop.width, 1), 0.01, 1),
        height: clamp(finiteNumber(rawCrop.height, 1), 0.01, 1),
      }
    : null;
  if (crop) {
    crop.width = Math.min(crop.width, 1 - crop.x);
    crop.height = Math.min(crop.height, 1 - crop.y);
  }
  return {
    duration,
    speed,
    aspect,
    customAspect: clamp(finiteNumber(settings.customAspect, 0.75), 0.4, 2.5),
    start: clamp(finiteNumber(settings.start, 0), 0, 1800),
    coverOffset: clamp(finiteNumber(settings.coverOffset, 0.2), 0, duration - 0.05),
    focusX: clamp(finiteNumber(settings.focusX, 50), 0, 100),
    focusY: clamp(finiteNumber(settings.focusY, 50), 0, 100),
    // 实况本来就带声音，默认保留；老数据没有这个字段时同样按开启处理。
    sound: settings.sound !== false,
    crop,
  };
}

const imageCache = new Map();

function loadImage(src) {
  const cached = imageCache.get(src);
  if (cached) return cached;
  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    try {
      const sourceUrl = new URL(String(src || ""), window.location.href);
      if (["http:", "https:"].includes(sourceUrl.protocol) && sourceUrl.origin !== window.location.origin) {
        img.crossOrigin = "anonymous";
        img.referrerPolicy = "no-referrer";
      }
    } catch {
      // data:、blob: 和内置 SVG 不需要跨域设置。
    }
    img.onload = () => resolve(img);
    img.onerror = () => { imageCache.delete(src); reject(new Error("图片无法以可导出的方式加载。")); };
    img.src = src;
  });
  imageCache.set(src, promise);
  return promise;
}

function isImageFile(file) {
  return file?.type?.startsWith("image/") || /\.(avif|bmp|gif|heic|jpe?g|png|svg|webp)$/i.test(file?.name || "");
}

function createImportedImageId(index = 0) {
  const random = window.crypto?.randomUUID?.().slice(0, 8) || Math.random().toString(36).slice(2, 10);
  return `img_${Date.now().toString(36)}_${index.toString(36)}_${random}`;
}

function sourcePathForFile(file) {
  return file.webkitRelativePath || file.name || "图片";
}

async function addImageFiles(files, sourcePaths = null) {
  const imageFiles = Array.from(files || []).filter(isImageFile);
  const tags = [];
  const ids = [];

  for (const [index, file] of imageFiles.entries()) {
    const src = await readFileAsDataURL(file);
    const id = createImportedImageId(index);
    state.images[id] = {
      src,
      name: file.name || "图片",
      sourcePath: sourcePaths?.get(file) || sourcePathForFile(file),
      vaultPath: sourcePaths?.get(file) || null,
      crop: null,
      layout: defaultNewImageLayout(),
    };
    ids.push(id);
    tags.push(`[[image:${id}]]`);
  }

  return { ids, tags, skipped: Array.from(files || []).length - imageFiles.length };
}

function insertImageTagsAtCursor(tags, cursor = els.content.selectionStart) {
  if (!tags.length) return;
  insertAtRange(els.content, `\n${tags.join("\n\n")}\n`, cursor, cursor);
  updateImageList();
}

async function handleContentImage(event) {
  const result = await addImageFiles(event.target.files);
  event.target.value = "";
  if (!result.tags.length) return;
  insertImageTagsAtCursor(result.tags);
  els.status.textContent = `已插入 ${result.tags.length} 张图片`;
}

function normalizeObsidianImagePath(value) {
  let path = String(value || "").trim().replace(/^<|>$/g, "");
  try {
    path = decodeURIComponent(path);
  } catch {
    // Keep the original text when the reference contains an incomplete escape sequence.
  }
  return path
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/[?#].*$/, "")
    .replace(/^\/+/, "")
    .toLowerCase();
}

function imageReferenceKeys(reference) {
  const path = normalizeObsidianImagePath(reference);
  if (!path) return [];
  const name = path.split("/").filter(Boolean).pop();
  return name && name !== path ? [path, name] : [path];
}

function buildImageReferenceLookup(images) {
  const lookup = new Map();
  Object.entries(images || {}).forEach(([id, image]) => {
    imageReferenceKeys(image?.sourcePath || image?.name).forEach((key) => {
      if (!lookup.has(key)) lookup.set(key, []);
      lookup.get(key).push(id);
    });
  });
  return lookup;
}

function resolveObsidianImageReference(reference, lookup) {
  const keys = imageReferenceKeys(reference);
  for (const key of keys) {
    const ids = lookup.get(key) || [];
    if (ids.length === 1) return { id: ids[0] };
    if (ids.length > 1) return { ambiguous: true };
  }
  return { missing: true };
}

function convertObsidianImageReferences(markdown, images) {
  const lookup = buildImageReferenceLookup(images);
  const unresolved = new Set();
  let matched = 0;
  const replaceReference = (whole, reference) => {
    const target = String(reference || "").split("|")[0].trim();
    const result = resolveObsidianImageReference(target, lookup);
    if (result.id) {
      matched += 1;
      return `[[image:${result.id}]]`;
    }
    unresolved.add(`${result.ambiguous ? "重复文件名：" : "未找到："}${target}`);
    return whole;
  };

  let content = String(markdown || "").replace(/!\[\[([^\]\n]+)\]\]/g, replaceReference);
  content = content.replace(/!\[[^\]\n]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+[^)]*)?\)/g, (whole, wrappedPath, plainPath) => {
    return replaceReference(whole, wrappedPath || plainPath);
  });
  return { content, matched, unresolved: Array.from(unresolved) };
}

function countMarkdownImageReferences(markdown) {
  const text = String(markdown || "");
  return (text.match(/!\[\[[^\]\n]+\]\]/g) || []).length + (text.match(/!\[[^\]\n]*\]\([^)]*\)/g) || []).length;
}

function openObsidianVaultDatabase() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("浏览器不支持本地仓库授权保存"));
      return;
    }
    const request = window.indexedDB.open(OBSIDIAN_VAULT_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(OBSIDIAN_VAULT_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readStoredObsidianVault() {
  const db = await openObsidianVaultDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(OBSIDIAN_VAULT_STORE, "readonly");
    const request = transaction.objectStore(OBSIDIAN_VAULT_STORE).get(OBSIDIAN_VAULT_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function saveObsidianVault(handle) {
  const db = await openObsidianVaultDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(OBSIDIAN_VAULT_STORE, "readwrite");
    transaction.objectStore(OBSIDIAN_VAULT_STORE).put(handle, OBSIDIAN_VAULT_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

function setObsidianVaultStatus(message, connected = false) {
  const statusText = String(message || "");
  if (statusText.startsWith("已连接：")) {
    els.obsidianVaultStatus.innerHTML = `已连接：<b>${escapeHtml(statusText.replace(/^已连接：/, ""))}</b>`;
  } else {
    els.obsidianVaultStatus.textContent = statusText;
  }
  els.obsidianVaultStatus.parentElement?.classList.toggle("is-connected", connected);
  els.obsidianImportMenu?.classList.toggle("is-vault-connected", hasConnectedObsidianVault());
  els.connectObsidianVault.innerHTML = connected
    ? '<i data-lucide="folder-cog"></i> 更换仓库'
    : '<i data-lucide="folder-open"></i> 连接仓库';
  if (window.lucide) window.lucide.createIcons();
}

function canUseDirectoryPickerSafely() {
  const userAgent = navigator.userAgent || "";
  const embeddedBrowser = /Electron|Codex|ChatGPT|OpenAI/i.test(userAgent);
  const localPage = ["localhost", "127.0.0.1", ""].includes(window.location.hostname) || window.location.protocol === "file:";
  return Boolean(window.showDirectoryPicker && window.isSecureContext && !embeddedBrowser && !localPage);
}

function hasConnectedObsidianVault() {
  return Boolean(obsidianVault.handle || obsidianVault.fileLookup);
}

function buildVaultFileLookup(files) {
  const lookup = new Map();
  Array.from(files || []).filter(isImageFile).forEach((file) => {
    imageReferenceKeys(sourcePathForFile(file)).forEach((key) => {
      if (!lookup.has(key)) lookup.set(key, []);
      lookup.get(key).push(file);
    });
  });
  return lookup;
}

function findFileInSelectedVault(reference) {
  if (!obsidianVault.fileLookup) return null;
  for (const key of imageReferenceKeys(reference)) {
    const files = obsidianVault.fileLookup.get(key) || [];
    if (files.length === 1) return files[0];
  }
  return null;
}

async function loadObsidianVaultConnection() {
  if (!canUseDirectoryPickerSafely()) {
    setObsidianVaultStatus("点击连接仓库后选择 Obsidian 文件夹");
    return;
  }
  try {
    const handle = await readStoredObsidianVault();
    if (!handle) return;
    obsidianVault.handle = handle;
    const readPermission = await handle.queryPermission({ mode: "read" });
    let writePermission = "prompt";
    try {
      writePermission = await handle.queryPermission({ mode: "readwrite" });
    } catch {
      // Some browsers can read a saved directory handle but do not expose write permission queries.
    }
    obsidianVault.writable = writePermission === "granted";
    setObsidianVaultStatus(readPermission === "granted" ? `已连接：${handle.name}` : `已记住：${handle.name}（首次使用时确认权限）`, readPermission === "granted");
  } catch {
    setObsidianVaultStatus("尚未连接仓库");
  }
}

async function connectObsidianVault() {
  if (!canUseDirectoryPickerSafely()) {
    els.obsidianVaultFolder?.click();
    return;
  }
  try {
    const handle = await window.showDirectoryPicker({ mode: "read" });
    obsidianVault.handle = handle;
    obsidianVault.fileLookup = null;
    obsidianVault.writable = false;
    await saveObsidianVault(handle);
    setObsidianVaultStatus(`已连接：${handle.name}`, true);
    els.status.textContent = "仓库已连接。以后直接把 Obsidian Markdown 粘贴到正文编辑区即可。";
  } catch (error) {
    if (error?.name !== "AbortError") setObsidianVaultStatus("连接失败，请重新选择 Obsidian 仓库根目录。");
  }
}

function handleObsidianVaultFolder(event) {
  const files = Array.from(event.target.files || []);
  event.target.value = "";
  if (!files.length) return;
  const rootName = files[0]?.webkitRelativePath?.split("/")?.[0] || "已选择的仓库";
  obsidianVault.handle = null;
  obsidianVault.fileLookup = buildVaultFileLookup(files);
  obsidianVault.writable = false;
  setObsidianVaultStatus(`已连接：${rootName}`, true);
  els.status.textContent = "仓库已连接。以后直接把 Obsidian Markdown 粘贴到正文编辑区即可。";
}

async function ensureObsidianVaultPermission() {
  if (obsidianVault.fileLookup) return true;
  if (!obsidianVault.handle) return false;
  let permission = await obsidianVault.handle.queryPermission({ mode: "read" });
  if (permission !== "granted") permission = await obsidianVault.handle.requestPermission({ mode: "read" });
  const granted = permission === "granted";
  setObsidianVaultStatus(granted ? `已连接：${obsidianVault.handle.name}` : `需要允许读取：${obsidianVault.handle.name}`, granted);
  return granted;
}

async function ensureObsidianVaultWritePermission() {
  if (!obsidianVault.handle) return false;
  try {
    let permission = await obsidianVault.handle.queryPermission({ mode: "readwrite" });
    if (permission !== "granted") permission = await obsidianVault.handle.requestPermission({ mode: "readwrite" });
    obsidianVault.writable = permission === "granted";
    setObsidianVaultStatus(
      obsidianVault.writable ? `已连接：${obsidianVault.handle.name}` : `仓库只读：${obsidianVault.handle.name}`,
      true,
    );
    return obsidianVault.writable;
  } catch {
    obsidianVault.writable = false;
    return false;
  }
}

function normalizeObsidianNotePath(value) {
  const path = String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
  if (!path) return null;
  return path.toLowerCase().endsWith(".md") ? path : `${path}.md`;
}

function safeObsidianFileName(value, fallback = "未命名笔记") {
  const name = String(value || "")
    .replace(/[\\/:*?"<>|\r\n]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim();
  return (name || fallback).slice(0, 80);
}

function currentObsidianNotePath() {
  if (state.obsidianNotePath) return state.obsidianNotePath;
  const title = projectTitleFromData(readForm());
  return `写了就发/${safeObsidianFileName(title)}.md`;
}

function imageExtensionFromSource(image, blob) {
  const nameMatch = String(image?.name || "").match(/\.(avif|bmp|gif|heic|jpe?g|png|svg|webp)$/i);
  if (nameMatch) return `.${nameMatch[1].toLowerCase().replace("jpeg", "jpg")}`;
  const mimeExtensions = {
    "image/avif": ".avif",
    "image/bmp": ".bmp",
    "image/gif": ".gif",
    "image/heic": ".heic",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/svg+xml": ".svg",
    "image/webp": ".webp",
  };
  return mimeExtensions[blob?.type] || ".png";
}

async function imageBlobForObsidian(image) {
  const response = await fetch(image.src);
  if (!response.ok) throw new Error("图片读取失败");
  return response.blob();
}

async function buildObsidianExport() {
  const content = String(els.content.value || "");
  const imageIds = Array.from(content.matchAll(/\[\[image:([^\]\n]+)\]\]/g), (match) => match[1]);
  const references = new Map();
  const attachments = [];

  for (const imageId of new Set(imageIds)) {
    const image = state.images[imageId];
    if (!image) continue;
    if (image.vaultPath) {
      references.set(imageId, `![[${String(image.vaultPath).replace(/\\/g, "/")}]]`);
      continue;
    }
    const blob = await imageBlobForObsidian(image);
    const extension = imageExtensionFromSource(image, blob);
    const originalBase = String(image.name || "图片").replace(/\.[^.]+$/, "");
    const stableSuffix = imageId.replace(/[^a-z0-9_-]/gi, "").slice(-8) || "image";
    const fileName = `${safeObsidianFileName(originalBase, "图片")}-${stableSuffix}${extension}`;
    const path = `写了就发/附件/${fileName}`;
    attachments.push({ path, fileName, blob });
    references.set(imageId, `![[${path}]]`);
  }

  const markdown = content.replace(/\[\[image:([^\]\n]+)\]\]/g, (whole, imageId) => {
    return references.get(imageId) || `<!-- 缺失图片：${imageId} -->`;
  });

  return {
    markdown,
    notePath: currentObsidianNotePath(),
    attachments,
  };
}

async function getOrCreateVaultDirectory(root, parts) {
  let directory = root;
  for (const part of parts) directory = await directory.getDirectoryHandle(part, { create: true });
  return directory;
}

async function writeVaultFile(root, path, content) {
  const parts = String(path).split("/").filter(Boolean);
  const fileName = parts.pop();
  const directory = await getOrCreateVaultDirectory(root, parts);
  const fileHandle = await directory.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

async function writeObsidianExportToVault(exportData) {
  for (const attachment of exportData.attachments) {
    await writeVaultFile(obsidianVault.handle, attachment.path, attachment.blob);
  }
  await writeVaultFile(obsidianVault.handle, exportData.notePath, exportData.markdown);
}

async function downloadObsidianExportPackage(exportData) {
  if (!window.JSZip) throw new Error("ZIP 组件未加载");
  const zip = new window.JSZip();
  zip.file(exportData.notePath, exportData.markdown);
  exportData.attachments.forEach((attachment) => zip.file(attachment.path, attachment.blob));
  const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
  const title = exportData.notePath.split("/").pop().replace(/\.md$/i, "");
  await saveBlob(blob, `${safeObsidianFileName(title)}-Obsidian.zip`);
}

async function syncCurrentNoteToObsidian() {
  if (obsidianVault.syncing) return;
  if (!hasConnectedObsidianVault()) {
    els.obsidianImportMenu.open = true;
    els.status.textContent = "请先连接 Obsidian 仓库";
    requestAnimationFrame(() => positionToolPopover(els.obsidianImportMenu));
    return;
  }

  obsidianVault.syncing = true;
  els.syncObsidianVault.disabled = true;
  els.status.textContent = "正在确认 Obsidian 写入权限…";
  try {
    const canWriteToVault = Boolean(
      obsidianVault.handle && (obsidianVault.writable || (await ensureObsidianVaultWritePermission())),
    );
    els.status.textContent = "正在整理 Markdown 和图片…";
    const exportData = await buildObsidianExport();
    if (canWriteToVault) {
      await writeObsidianExportToVault(exportData);
      state.obsidianNotePath = exportData.notePath;
      saveState();
      els.status.textContent = `已同步到 Obsidian：${exportData.notePath}`;
      closeObsidianImportMenu();
      return;
    }

    await downloadObsidianExportPackage(exportData);
    els.status.textContent = "当前浏览器只有仓库读取权限，已下载 Obsidian 导入包，未直接写入仓库";
    closeObsidianImportMenu();
  } catch (error) {
    console.error(error);
    els.status.textContent = "同步失败：没有写入仓库，请检查权限后重试";
  } finally {
    obsidianVault.syncing = false;
    els.syncObsidianVault.disabled = false;
  }
}

function extractMarkdownImageReferences(markdown) {
  const references = new Set();
  const text = String(markdown || "");
  for (const match of text.matchAll(/!\[\[([^\]\n]+)\]\]/g)) {
    references.add(match[1].split("|")[0].trim());
  }
  for (const match of text.matchAll(/!\[[^\]\n]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+[^)]*)?\)/g)) {
    references.add((match[1] || match[2] || "").trim());
  }
  return Array.from(references).filter(Boolean);
}

function vaultReferenceParts(reference) {
  let path = String(reference || "").trim().replace(/^<|>$/g, "");
  try {
    path = decodeURIComponent(path);
  } catch {
    // Keep the original text when the reference contains an incomplete escape sequence.
  }
  return path
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/[?#].*$/, "")
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean);
}

async function findFileInObsidianVault(reference) {
  if (/^https?:/i.test(String(reference || ""))) return null;
  const parts = vaultReferenceParts(reference);
  if (!parts.length) return null;
  try {
    let directory = obsidianVault.handle;
    for (const part of parts.slice(0, -1)) directory = await directory.getDirectoryHandle(part);
    return await directory.getFileHandle(parts[parts.length - 1]);
  } catch {
    return findObsidianFileByName(obsidianVault.handle, parts[parts.length - 1]);
  }
}

async function findObsidianFileByName(directory, name) {
  if (!directory || !name) return null;
  for await (const [entryName, handle] of directory.entries()) {
    if (handle.kind === "file" && entryName.toLowerCase() === name.toLowerCase()) return handle;
    if (handle.kind === "directory" && ![".git", ".obsidian", "node_modules"].includes(entryName)) {
      const found = await findObsidianFileByName(handle, name);
      if (found) return found;
    }
  }
  return null;
}

function replaceEditorContent(content) {
  commitTextHistory();
  els.content.value = content;
  els.content.focus();
  els.content.setSelectionRange(0, 0);
  commitTextHistory();
  updateImageList();
  requestRender();
}

function closeObsidianImportMenu() {
  els.obsidianImportMenu.open = false;
}

function insertPastedMarkdown(markdown, cursor) {
  insertAtRange(els.content, markdown, cursor, cursor);
  updateImageList();
}

async function importMarkdownFromConnectedVault(markdown, cursor) {
  if (!hasConnectedObsidianVault() || obsidianVault.importing) return false;
  obsidianVault.importing = true;
  els.status.textContent = "正在从 Obsidian 仓库读取图片…";
  try {
    if (!(await ensureObsidianVaultPermission())) {
      insertPastedMarkdown(markdown, cursor);
      els.status.textContent = "未获得仓库读取权限，请重新连接后再试。";
      return true;
    }
    const lookup = buildImageReferenceLookup(state.images);
    const files = [];
    const sourcePaths = new Map();
    const missing = [];
    for (const reference of extractMarkdownImageReferences(markdown)) {
      if (resolveObsidianImageReference(reference, lookup).id) continue;
      const selectedFile = findFileInSelectedVault(reference);
      if (selectedFile) {
        files.push(selectedFile);
        sourcePaths.set(selectedFile, reference);
        continue;
      }
      const handle = obsidianVault.handle ? await findFileInObsidianVault(reference) : null;
      if (!handle) {
        missing.push(reference);
        continue;
      }
      const file = await handle.getFile();
      files.push(file);
      sourcePaths.set(file, reference);
    }
    if (missing.length) {
      const message = `仓库已连接，但没有找到 ${missing.length} 张图片：${missing.slice(0, 3).join("、")}。请确认选择的是包含这些路径的 Obsidian 仓库根目录。`;
      insertPastedMarkdown(markdown, cursor);
      els.obsidianImportMenu.open = true;
      els.status.textContent = message;
      return true;
    }
    const imported = await addImageFiles(files, sourcePaths);
    const converted = convertObsidianImageReferences(markdown, state.images);
    if (converted.unresolved.length) {
      insertPastedMarkdown(markdown, cursor);
      els.status.textContent = "发现重名图片，暂时无法自动判断该用哪一张。";
      return true;
    }
    insertPastedMarkdown(converted.content, cursor);
    els.status.textContent = `已从仓库自动读取 ${imported.ids.length} 张图片并插入光标位置`;
    closeObsidianImportMenu();
    return true;
  } catch (error) {
    console.error(error);
    insertPastedMarkdown(markdown, cursor);
    els.status.textContent = "读取 Obsidian 仓库失败，请重新连接仓库后再试。";
    return true;
  } finally {
    obsidianVault.importing = false;
  }
}

function readDroppedEntry(entry) {
  if (!entry) return Promise.resolve([]);
  if (entry.isFile) {
    return new Promise((resolve) => entry.file((file) => resolve([file]), () => resolve([])));
  }
  if (!entry.isDirectory) return Promise.resolve([]);
  const reader = entry.createReader();
  const readBatch = () => new Promise((resolve) => reader.readEntries(resolve, () => resolve([])));
  const readAll = async () => {
    const entries = [];
    let batch;
    do {
      batch = await readBatch();
      entries.push(...batch);
    } while (batch.length);
    return (await Promise.all(entries.map(readDroppedEntry))).flat();
  };
  return readAll();
}

async function getDroppedFiles(dataTransfer) {
  const entries = Array.from(dataTransfer?.items || [])
    .map((item) => item.webkitGetAsEntry?.())
    .filter(Boolean);
  if (entries.length) return (await Promise.all(entries.map(readDroppedEntry))).flat();
  return Array.from(dataTransfer?.files || []);
}

async function handleEditorPaste(event) {
  const cursor = event.currentTarget.selectionStart;
  const files = Array.from(event.clipboardData?.items || [])
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter(Boolean);
  if (!files.length) {
    const markdown = event.clipboardData?.getData("text/plain") || "";
    const references = countMarkdownImageReferences(markdown);
    if (!references) {
      // 微信自带表情复制出来只剩 [微笑] 这种占位文字，粘进来时直接换成 emoji。
      const wechat = convertWechatEmoticons(markdown);
      if (wechat.converted) {
        event.preventDefault();
        insertAtRange(els.content, wechat.text, cursor, event.currentTarget.selectionEnd ?? cursor);
        const notice = wechat.unknown.length
          ? `已把 ${wechat.converted} 个微信表情换成 emoji；这些还没收录：${wechat.unknown.slice(0, 6).map((name) => `[${name}]`).join("")}`
          : `已把 ${wechat.converted} 个微信表情换成 emoji`;
        // insertAtRange 会触发重排版，重排版结束时会改写状态栏；这里等它画完再写一次。
        els.status.textContent = notice;
        window.setTimeout(() => { els.status.textContent = notice; }, 400);
        return;
      }
      // 一个都没匹配上时，把疑似表情的名字报出来，方便补进对照表。
      if (wechat.unknown.length >= 2) {
        els.status.textContent = `这些表情还没收录，可以反馈给作者：${wechat.unknown.slice(0, 6).map((name) => `[${name}]`).join("")}`;
      }
      return;
    }
    event.preventDefault();
    if (hasConnectedObsidianVault()) {
      await importMarkdownFromConnectedVault(markdown, cursor);
      return;
    }
    insertPastedMarkdown(markdown, cursor);
    els.obsidianImportMenu.open = true;
    els.status.textContent = `已插入 ${references} 个图片引用；连接 Obsidian 仓库后可自动读取原图。`;
    requestAnimationFrame(() => positionToolPopover(els.obsidianImportMenu));
    return;
  }
  event.preventDefault();
  const imported = await addImageFiles(files);
  insertImageTagsAtCursor(imported.tags, cursor);
  els.status.textContent = `已粘贴 ${imported.tags.length} 张图片`;
}

async function handleEditorDrop(event) {
  const hasFiles = Array.from(event.dataTransfer?.types || []).includes("Files");
  if (!hasFiles) return;
  event.preventDefault();
  const files = await getDroppedFiles(event.dataTransfer);
  if (!files.some(isImageFile)) return;
  const imported = await addImageFiles(files);
  insertImageTagsAtCursor(imported.tags);
  els.status.textContent = `已插入 ${imported.tags.length} 张图片`;
}

/** 头像在卡片上最大只画到 164px，压到 512px 以内足够清晰，体积降一两个数量级。 */
async function compressAvatarFile(file, maxEdge = 512) {
  const raw = await readFileAsDataURL(file);
  const img = await loadImage(raw).catch(() => null);
  if (!img) return raw;
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  if (scale >= 1 && raw.length < 300 * 1024) return raw;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  // PNG / WebP / GIF 可能带透明，保留 PNG；照片转 JPEG，先铺白底
  const keepAlpha = /png|webp|gif/i.test(file.type);
  if (!keepAlpha) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(keepAlpha ? "image/png" : "image/jpeg", 0.9);
}

async function handleAvatar(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  state.avatar = await compressAvatarFile(file);
  state.avatarCrop = null;
  updateAvatarPreview();
  updateImageList();
  requestRender();
  await openCropper("avatar");
  event.target.value = "";
}

async function updateAvatarPreview() {
  if (!els.avatarPreview) return;
  if (!state.avatarCrop) {
    els.avatarPreview.src = state.avatar;
    return;
  }

  try {
    const image = await loadImage(state.avatar);
    const crop = clampCropRect(state.avatarCrop, image);
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 160;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    drawSourceCoverImage(ctx, image, crop, 0, 0, canvas.width, canvas.height);
    els.avatarPreview.src = canvas.toDataURL("image/png");
  } catch {
    els.avatarPreview.src = state.avatar;
  }
}

function updateImageList() {
  if (!els.imageList) return;
  els.imageList.innerHTML = "";
  const entries = Object.entries(state.images);

  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "插入图片后可在这里裁剪";
    els.imageList.append(empty);
    return;
  }

  for (const [id, image] of entries) {
    const row = document.createElement("div");
    row.className = "image-row";
    row.classList.toggle("is-live", image.kind === "live");

    const thumb = document.createElement("img");
    thumb.className = "image-thumb";
    thumb.src = image.src;
    thumb.alt = image.name || id;

    const meta = document.createElement("div");
    meta.className = "image-meta";
    const name = document.createElement("strong");
    name.textContent = image.name || id;
    const status = document.createElement("span");
    const layout = normalizeImageLayout(image.layout);
    const widthLabel = layout.fixedWidth && layout.fixedHeight
      ? `固定框 ${Math.round(layout.fixedWidth)}x${Math.round(layout.fixedHeight)}`
      : layout.widthPercent
        ? `${Math.round(layout.widthPercent)}%`
        : "自适应";
    const liveLabel = image.kind === "live"
      ? (() => {
          const live = normalizeLiveMediaSettings(image.liveSettings);
          return `${live.duration} 秒${live.speed > 1 ? ` · ${live.speed}×` : ""} · ${livePhotoAspectLabel(image)} · 实况`;
        })()
      : image.crop
        ? "已裁剪"
        : "原图比例";
    status.textContent = `${liveLabel} · ${widthLabel}`;
    meta.append(name, status);

    const actions = document.createElement("div");
    actions.className = "image-row-actions";
    const cropButton = document.createElement("button");
    cropButton.type = "button";
    cropButton.title = image.kind === "live" ? "编辑实况" : "裁剪图片";
    cropButton.setAttribute("aria-label", `${image.kind === "live" ? "编辑实况" : "裁剪"} ${image.name || id}`);
    cropButton.innerHTML = `<i data-lucide="${image.kind === "live" ? "aperture" : "crop"}"></i>`;
    cropButton.addEventListener("click", () => image.kind === "live" ? openLivePhotoEditor(id) : openCropper("image", id));

    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.title = "恢复原图";
    resetButton.setAttribute("aria-label", `恢复 ${image.name || id}`);
    resetButton.innerHTML = '<i data-lucide="rotate-ccw"></i>';
    resetButton.disabled = image.kind === "live" || !image.crop;
    resetButton.addEventListener("click", () => {
      image.crop = null;
      updateImageList();
      requestRender();
    });
    actions.append(cropButton, resetButton);

    row.append(thumb, meta, actions);
    els.imageList.append(row);
  }

  if (window.lucide) window.lucide.createIcons();
}

function defaultNewImageLayout() {
  const fixedWidth = normalizeFixedImageDimension(els.fixedImageWidth?.value, CARD_CONTENT_WIDTH);
  const fixedHeight = normalizeFixedImageDimension(els.fixedImageHeight?.value, CARD_MAX_IMAGE_HEIGHT);
  if (fixedWidth && fixedHeight) {
    return {
      fixedWidth,
      fixedHeight,
      align: "center",
    };
  }

  const percent = Number(els.imageWidthPercent?.value);
  if (!Number.isFinite(percent)) return null;
  return {
    widthPercent: clamp(percent, 25, 100),
    align: "center",
  };
}

function applyImageWidthToAll() {
  const entries = Object.entries(state.images);
  if (!entries.length) {
    els.status.textContent = "还没有插入图片";
    return;
  }

  const widthPercent = clamp(Number(els.imageWidthPercent?.value) || 100, 25, 100);
  if (els.imageWidthPercent) els.imageWidthPercent.value = String(Math.round(widthPercent));

  for (const [, image] of entries) {
    image.layout = {
      ...normalizeImageLayout(image.layout),
      widthPercent,
      fixedWidth: null,
      fixedHeight: null,
    };
  }

  updateImageList();
  saveState();
  render();
  els.status.textContent = `已将 ${entries.length} 张图片设置为 ${Math.round(widthPercent)}% 宽度`;
}

function applyFixedImageSizeToAll() {
  const entries = Object.entries(state.images);
  if (!entries.length) {
    els.status.textContent = "还没有插入图片";
    return;
  }

  const fixedWidth = normalizeFixedImageDimension(els.fixedImageWidth?.value, CARD_CONTENT_WIDTH);
  const fixedHeight = normalizeFixedImageDimension(els.fixedImageHeight?.value, CARD_MAX_IMAGE_HEIGHT);
  if (!fixedWidth || !fixedHeight) {
    els.status.textContent = "请输入固定宽度和固定高度";
    return;
  }

  if (els.fixedImageWidth) els.fixedImageWidth.value = String(Math.round(fixedWidth));
  if (els.fixedImageHeight) els.fixedImageHeight.value = String(Math.round(fixedHeight));

  for (const [, image] of entries) {
    image.layout = {
      ...normalizeImageLayout(image.layout),
      fixedWidth,
      fixedHeight,
      widthPercent: null,
    };
  }

  updateImageList();
  saveState();
  render();
  els.status.textContent = `已将 ${entries.length} 张图片设置为 ${Math.round(fixedWidth)}x${Math.round(fixedHeight)}`;
}

function normalizeFixedImageDimension(value, max) {
  const dimension = Number(value);
  if (!Number.isFinite(dimension) || dimension <= 0) return null;
  return clamp(dimension, 80, max);
}

async function openCropper(kind, id = null) {
  const targetImage = kind === "avatar" ? { src: state.avatar, name: "头像", crop: state.avatarCrop } : state.images[id];
  if (!targetImage?.src) return;

  cropper.image = await loadImage(targetImage.src).catch(() => null);
  if (!cropper.image) return;

  cropper.target = { kind, id };
  cropper.aspect = null;
  cropper.drag = null;
  cropper.rect = clampCropRect(targetImage.crop, cropper.image);
  els.cropTitle.textContent = kind === "avatar" ? "裁剪头像" : `裁剪 ${targetImage.name || id}`;
  els.cropSubtitle.textContent = kind === "avatar" ? "头像最终会显示为圆形，建议使用 1:1" : "不裁剪时会按原图比例放入页面";
  setActiveRatioButton("free");
  els.cropModal.classList.remove("hidden");
  drawCropper();
  if (window.lucide) window.lucide.createIcons();
}

function closeCropper() {
  els.cropModal.classList.add("hidden");
  cropper.target = null;
  cropper.image = null;
  cropper.rect = null;
  cropper.drag = null;
}

function applyCropper() {
  if (!cropper.target || !cropper.image || !cropper.rect) return;
  const crop = isFullCrop(cropper.rect, cropper.image)
    ? null
    : {
        x: Math.round(cropper.rect.x),
        y: Math.round(cropper.rect.y),
        width: Math.round(cropper.rect.width),
        height: Math.round(cropper.rect.height),
      };

  if (cropper.target.kind === "avatar") {
    state.avatarCrop = crop;
    updateAvatarPreview();
    scheduleCloudProfileSync({ uploadAvatar: true });
  } else if (state.images[cropper.target.id]) {
    state.images[cropper.target.id].crop = crop;
  }
  updateImageList();
  closeCropper();
  refreshPairEditor();
  requestRender();
}

function resetCropperTarget() {
  if (!cropper.target) return;
  if (cropper.target.kind === "avatar") {
    state.avatarCrop = null;
    updateAvatarPreview();
    scheduleCloudProfileSync({ uploadAvatar: true });
  } else if (state.images[cropper.target.id]) {
    state.images[cropper.target.id].crop = null;
  }
  updateImageList();
  closeCropper();
  refreshPairEditor();
  requestRender();
}

function setCropAspect(value) {
  if (!cropper.image || !cropper.rect) return;
  let aspect = null;
  if (value === "original") aspect = cropper.image.width / cropper.image.height;
  if (value !== "free" && value !== "original") aspect = Number(value);
  cropper.aspect = Number.isFinite(aspect) && aspect > 0 ? aspect : null;
  cropper.rect = fitRectToAspect(cropper.rect, cropper.image, cropper.aspect);
  setActiveRatioButton(value);
  drawCropper();
}

function setActiveRatioButton(value) {
  els.ratioButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.ratio === value);
  });
}

function fullCropRect(image) {
  return { x: 0, y: 0, width: image.width, height: image.height };
}

function clampCropRect(crop, image) {
  if (!crop) return fullCropRect(image);
  const width = clamp(Number(crop.width) || image.width, 20, image.width);
  const height = clamp(Number(crop.height) || image.height, 20, image.height);
  return {
    x: clamp(Number(crop.x) || 0, 0, image.width - width),
    y: clamp(Number(crop.y) || 0, 0, image.height - height),
    width,
    height,
  };
}

function isFullCrop(rect, image) {
  return rect.x <= 1 && rect.y <= 1 && Math.abs(rect.width - image.width) <= 1 && Math.abs(rect.height - image.height) <= 1;
}

function fitRectToAspect(rect, image, aspect) {
  if (!aspect) return clampCropRect(rect, image);
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  let width = rect.width;
  let height = width / aspect;
  if (height > rect.height) {
    height = rect.height;
    width = height * aspect;
  }
  if (width > image.width) {
    width = image.width;
    height = width / aspect;
  }
  if (height > image.height) {
    height = image.height;
    width = height * aspect;
  }
  width = Math.max(20, width);
  height = Math.max(20, height);
  return {
    x: clamp(centerX - width / 2, 0, image.width - width),
    y: clamp(centerY - height / 2, 0, image.height - height),
    width,
    height,
  };
}

function getCropDisplay() {
  const canvas = els.cropCanvas;
  const image = cropper.image;
  const padding = 26;
  const scale = Math.min((canvas.width - padding * 2) / image.width, (canvas.height - padding * 2) / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  return {
    x: (canvas.width - width) / 2,
    y: (canvas.height - height) / 2,
    width,
    height,
    scale,
  };
}

function sourceToCanvasRect(rect) {
  const display = cropper.display;
  return {
    x: display.x + rect.x * display.scale,
    y: display.y + rect.y * display.scale,
    width: rect.width * display.scale,
    height: rect.height * display.scale,
  };
}

function canvasPointFromEvent(event) {
  const bounds = els.cropCanvas.getBoundingClientRect();
  return {
    x: ((event.clientX - bounds.left) / bounds.width) * els.cropCanvas.width,
    y: ((event.clientY - bounds.top) / bounds.height) * els.cropCanvas.height,
  };
}

function sourcePointFromCanvas(point) {
  const display = cropper.display;
  return {
    x: clamp((point.x - display.x) / display.scale, 0, cropper.image.width),
    y: clamp((point.y - display.y) / display.scale, 0, cropper.image.height),
  };
}

function drawCropper() {
  if (!cropper.image || !cropper.rect) return;
  const canvas = els.cropCanvas;
  const ctx = canvas.getContext("2d");
  cropper.display = getCropDisplay();
  const display = cropper.display;
  const crop = sourceToCanvasRect(cropper.rect);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0b1020";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(cropper.image, display.x, display.y, display.width, display.height);

  ctx.fillStyle = "rgba(2, 6, 23, 0.58)";
  ctx.fillRect(display.x, display.y, display.width, crop.y - display.y);
  ctx.fillRect(display.x, crop.y + crop.height, display.width, display.y + display.height - crop.y - crop.height);
  ctx.fillRect(display.x, crop.y, crop.x - display.x, crop.height);
  ctx.fillRect(crop.x + crop.width, crop.y, display.x + display.width - crop.x - crop.width, crop.height);

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.strokeRect(crop.x, crop.y, crop.width, crop.height);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.76)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 3; i += 1) {
    const gx = crop.x + (crop.width * i) / 3;
    const gy = crop.y + (crop.height * i) / 3;
    ctx.beginPath();
    ctx.moveTo(gx, crop.y);
    ctx.lineTo(gx, crop.y + crop.height);
    ctx.moveTo(crop.x, gy);
    ctx.lineTo(crop.x + crop.width, gy);
    ctx.stroke();
  }

  ctx.fillStyle = "#ffffff";
  const handles = [
    [crop.x, crop.y],
    [crop.x + crop.width, crop.y],
    [crop.x, crop.y + crop.height],
    [crop.x + crop.width, crop.y + crop.height],
  ];
  for (const [x, y] of handles) {
    ctx.fillRect(x - 5, y - 5, 10, 10);
  }
}

function detectCropHit(point) {
  const crop = sourceToCanvasRect(cropper.rect);
  const corners = {
    nw: [crop.x, crop.y],
    ne: [crop.x + crop.width, crop.y],
    sw: [crop.x, crop.y + crop.height],
    se: [crop.x + crop.width, crop.y + crop.height],
  };
  for (const [handle, [x, y]] of Object.entries(corners)) {
    if (Math.hypot(point.x - x, point.y - y) <= 20) return handle;
  }
  if (point.x >= crop.x && point.x <= crop.x + crop.width && point.y >= crop.y && point.y <= crop.y + crop.height) {
    return "move";
  }
  return "move-new";
}

function startCropDrag(event) {
  if (!cropper.image || !cropper.rect) return;
  event.preventDefault();
  cropper.display = getCropDisplay();
  const canvasPoint = canvasPointFromEvent(event);
  const display = cropper.display;
  const action = detectCropHit(canvasPoint);
  // 默认全图裁剪框的四个角柄正好压在图片显示区边缘，命中半径会伸到
  // 显示区外侧；先判角柄再做边界检查，否则点角柄偏外半格就被吞掉。
  const insideDisplay =
    canvasPoint.x >= display.x &&
    canvasPoint.x <= display.x + display.width &&
    canvasPoint.y >= display.y &&
    canvasPoint.y <= display.y + display.height;
  if (!insideDisplay && (action === "move" || action === "move-new")) {
    return;
  }

  const sourcePoint = sourcePointFromCanvas(canvasPoint);
  if (action === "move-new") {
    cropper.rect = clampMovedRect(
      {
        ...cropper.rect,
        x: sourcePoint.x - cropper.rect.width / 2,
        y: sourcePoint.y - cropper.rect.height / 2,
      },
      cropper.image,
    );
  }

  cropper.drag = {
    action: action === "move-new" ? "move" : action,
    startX: sourcePoint.x,
    startY: sourcePoint.y,
    startRect: { ...cropper.rect },
  };
  drawCropper();
}

function moveCropDrag(event) {
  if (!cropper.drag || !cropper.image) return;
  const point = sourcePointFromCanvas(canvasPointFromEvent(event));
  const drag = cropper.drag;

  if (drag.action === "move") {
    cropper.rect = clampMovedRect(
      {
        ...drag.startRect,
        x: drag.startRect.x + point.x - drag.startX,
        y: drag.startRect.y + point.y - drag.startY,
      },
      cropper.image,
    );
  } else {
    cropper.rect = resizeCropRect(drag.action, drag.startRect, point, cropper.image, cropper.aspect);
  }
  drawCropper();
}

function stopCropDrag() {
  cropper.drag = null;
}

function clampMovedRect(rect, image) {
  return {
    ...rect,
    x: clamp(rect.x, 0, image.width - rect.width),
    y: clamp(rect.y, 0, image.height - rect.height),
  };
}

function resizeCropRect(handle, startRect, point, image, aspect) {
  const anchorX = handle.includes("w") ? startRect.x + startRect.width : startRect.x;
  const anchorY = handle.includes("n") ? startRect.y + startRect.height : startRect.y;
  let width = Math.max(20, Math.abs(point.x - anchorX));
  let height = Math.max(20, Math.abs(point.y - anchorY));

  if (aspect) {
    const horizontalChange = Math.abs(width - startRect.width);
    const verticalChange = Math.abs(height - startRect.height) * aspect;
    if (horizontalChange >= verticalChange) height = width / aspect;
    else width = height * aspect;
  }

  if (aspect) {
    const maxWidth = Math.min(image.width, image.height * aspect);
    width = clamp(width, 20, maxWidth);
    height = width / aspect;
  } else {
    width = Math.min(width, image.width);
    height = Math.min(height, image.height);
  }
  let x = handle.includes("w") ? anchorX - width : anchorX;
  let y = handle.includes("n") ? anchorY - height : anchorY;

  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x + width > image.width) x = image.width - width;
  if (y + height > image.height) y = image.height - height;
  return fitRectToAspect({ x, y, width, height }, image, aspect);
}

// [[image:a|b]] 双图拼图：两张图左右并排合成一块；
// 第三段是可选的整体比例，如 [[image:a|b|4x3]]
const PAIR_RATIOS = { "16x9": 16 / 9, "3x2": 3 / 2, "4x3": 4 / 3, "1x1": 1 };
const DEFAULT_PAIR_RATIO = "16x9";

function normalizePairRatio(value) {
  return PAIR_RATIOS[value] ? value : DEFAULT_PAIR_RATIO;
}

function resolveInternalImagePairBlock(line) {
  const pair = line.match(/^\[\[image:([\w-]+)\|([\w-]+)(?:\|([\w-]+))?\]\]$/);
  return pair ? { ids: [pair[1], pair[2]], ratio: normalizePairRatio(pair[3]) } : null;
}

function resolveMarkdownImageBlock(line, imageLookup) {
  const internal = line.match(/^\[\[image:([\w-]+)\]\]$/);
  if (internal) return internal[1];

  const obsidian = line.match(/^!\[\[([^\]\n]+)\]\]$/);
  if (obsidian) return resolveObsidianImageReference(obsidian[1].split("|")[0].trim(), imageLookup).id || null;

  const markdown = line.match(/^!\[[^\]\n]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+[^)]*)?\)$/);
  if (markdown) return resolveObsidianImageReference(markdown[1] || markdown[2], imageLookup).id || null;
  return null;
}

function isMarkdownImageBlock(line) {
  return /^\[\[image:[\w-]+\]\]$/.test(line)
    || /^!\[\[[^\]\n]+\]\]$/.test(line)
    || /^!\[[^\]\n]*\]\((?:<[^>]+>|[^\s)]+)(?:\s+[^)]*)?\)$/.test(line);
}

function collectMultilineUnderlineMarkers(text) {
  const markers = [];
  let searchFrom = 0;
  while (searchFrom < text.length) {
    const open = text.indexOf("{{underline:", searchFrom);
    if (open === -1) break;
    const marker = matchUnderlineMarker(text, open);
    if (marker && text.slice(marker.innerStart, marker.innerEnd).includes("\n")) {
      markers.push({
        ...marker,
        open,
        tokens: applyInlineStyle(
          parseInline(text.slice(marker.innerStart, marker.innerEnd), marker.innerStart),
          { underline: marker.style },
        ),
      });
    }
    searchFrom = open + 2;
  }
  return markers;
}

function sliceInlineTokensBySourceRange(tokens, start, end) {
  const sliced = [];
  for (const token of tokens) {
    if (!Number.isFinite(token.sourceStart) || !Number.isFinite(token.sourceEnd)) continue;
    if (token.sourceEnd <= start || token.sourceStart >= end) continue;
    if (token.type === "image") {
      sliced.push({ ...token });
      continue;
    }
    const from = Math.max(start, token.sourceStart);
    const to = Math.min(end, token.sourceEnd);
    if (to <= from) continue;
    const textStart = from - token.sourceStart;
    const textEnd = to - token.sourceStart;
    const text = token.text.slice(textStart, textEnd);
    if (!text) continue;
    sliced.push({ ...token, text, sourceStart: from, sourceEnd: to });
  }
  return sliced;
}

function parseInlineSourceRange(source, start, end, multilineUnderlines = []) {
  const safeStart = clamp(Number(start) || 0, 0, source.length);
  const safeEnd = clamp(Number(end) || safeStart, safeStart, source.length);
  const relevant = multilineUnderlines.filter((marker) => marker.open < safeEnd && marker.end > safeStart);
  if (!relevant.length) return parseInline(source.slice(safeStart, safeEnd), safeStart);

  const syntaxRanges = relevant.flatMap((marker) => [
    { start: marker.open, end: marker.innerStart },
    { start: marker.innerEnd, end: marker.end },
  ]);
  const boundaries = new Set([safeStart, safeEnd]);
  for (const marker of relevant) {
    for (const boundary of [marker.open, marker.innerStart, marker.innerEnd, marker.end]) {
      if (boundary > safeStart && boundary < safeEnd) boundaries.add(boundary);
    }
  }

  const points = [...boundaries].sort((a, b) => a - b);
  const tokens = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const partStart = points[index];
    const partEnd = points[index + 1];
    if (partEnd <= partStart) continue;
    if (syntaxRanges.some((range) => range.start <= partStart && partEnd <= range.end)) continue;

    const active = relevant
      .filter((marker) => marker.innerStart <= partStart && partEnd <= marker.innerEnd)
      .sort((a, b) => (a.innerEnd - a.innerStart) - (b.innerEnd - b.innerStart));
    let partTokens = active.length
      ? sliceInlineTokensBySourceRange(active[0].tokens, partStart, partEnd)
      : parseInline(source.slice(partStart, partEnd), partStart);
    for (const marker of active) {
      partTokens = applyInlineStyle(partTokens, { underline: marker.style });
    }
    tokens.push(...partTokens);
  }
  return tokens;
}

function parseBlocks(content, images = {}) {
  const normalized = content.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const multilineUnderlines = collectMultilineUnderlineMarkers(normalized);
  const imageLookup = buildImageReferenceLookup(images);
  const lineOffsets = [];
  let runningOffset = 0;
  lines.forEach((line) => {
    lineOffsets.push(runningOffset);
    runningOffset += line.length + 1;
  });
  const blocks = [];
  let paragraphLines = [];
  let paragraphStart = null;
  let paragraphEnd = null;
  let lastQuoteLineIndex = -2;

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    blocks.push({ type: "p", lines: paragraphLines, sourceStart: paragraphStart, sourceEnd: paragraphEnd });
    paragraphLines = [];
    paragraphStart = null;
    paragraphEnd = null;
  };

  const appendParagraphLine = (tokens, index, line) => {
    if (!tokens.length) return;
    paragraphLines.push(tokens);
    if (paragraphStart === null) paragraphStart = lineOffsets[index];
    paragraphEnd = lineOffsets[index] + line.length;
  };

  const appendParagraphTokens = (tokens, index, line) => {
    let textTokens = [];
    for (const token of tokens) {
      if (token.type !== "image") {
        textTokens.push(token);
        continue;
      }
      appendParagraphLine(textTokens, index, line);
      flushParagraph();
      textTokens = [];
      if (images[token.imageId]) {
        blocks.push({
          type: "image",
          id: token.imageId,
          sourceStart: token.sourceStart,
          sourceEnd: token.sourceEnd,
        });
      }
    }
    appendParagraphLine(textTokens, index, line);
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const hasContentBeforeLine = blocks.length > 0 || paragraphLines.length > 0;
    const leading = line.match(/^\s*/)[0].length;
    const trailing = line.match(/\s*$/)[0].length;
    const trimmed = line.slice(leading, line.length - trailing);
    const trimmedStart = lineOffsets[index] + leading;

    if (trimmed) {
      const pairBlock = resolveInternalImagePairBlock(trimmed);
      const imageId = resolveMarkdownImageBlock(trimmed, imageLookup);
      if (pairBlock) {
        flushParagraph();
        const validIds = pairBlock.ids.filter((id) => images[id]);
        if (validIds.length > 1) {
          blocks.push({
            type: "imagePair",
            ids: validIds,
            ratio: pairBlock.ratio,
            sourceStart: lineOffsets[index],
            sourceEnd: lineOffsets[index] + line.length,
          });
        } else if (validIds.length === 1) {
          // 拼图里的一张图被删掉时降级为单图
          blocks.push({
            type: "image",
            id: validIds[0],
            sourceStart: lineOffsets[index],
            sourceEnd: lineOffsets[index] + line.length,
          });
        }
      } else if (isMarkdownImageBlock(trimmed)) {
        flushParagraph();
        if (imageId) {
          blocks.push({
            type: "image",
            id: imageId,
            sourceStart: lineOffsets[index],
            sourceEnd: lineOffsets[index] + line.length,
          });
        }
      } else if (isMarkdownTableHeader(trimmed, lines[index + 1])) {
        flushParagraph();
        const headerCells = splitMarkdownTableRow(trimmed);
        const rows = [];
        let rowIndex = index + 2;
        while (rowIndex < lines.length) {
          const cells = splitMarkdownTableRow(lines[rowIndex].trim());
          if (!cells || !cells.length) break;
          rows.push(cells.map((cell) => parseInline(cell)));
          rowIndex += 1;
        }
        const finalRowIndex = Math.max(index + 1, rowIndex - 1);
        blocks.push({
          type: "table",
          header: headerCells.map((cell) => parseInline(cell)),
          rows,
          sourceStart: lineOffsets[index],
          sourceEnd: lineOffsets[finalRowIndex] + lines[finalRowIndex].length,
        });
        index = rowIndex - 1;
      } else {
        const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
        const listMarker = trimmed.match(/^([-*+]\s+|\d+[.)]\s+)/);
        if (heading) {
          flushParagraph();
          const level = heading[1].length;
          const contentStart = trimmedStart + heading[0].length - heading[2].length;
          blocks.push({
            type: level === 1 ? "h1" : level === 2 ? "h2" : "h3",
            tokens: parseInlineSourceRange(
              normalized,
              contentStart,
              trimmedStart + trimmed.length,
              multilineUnderlines,
            ),
            sourceStart: lineOffsets[index],
            sourceEnd: lineOffsets[index] + line.length,
          });
        } else if (trimmed.startsWith("> ")) {
          flushParagraph();
          const contentStart = trimmedStart + 2 + countLeadingSpaces(trimmed.slice(2));
          const quoteTokens = parseInlineSourceRange(
            normalized,
            contentStart,
            contentStart + trimmed.slice(2).trim().length,
            multilineUnderlines,
          );
          // 连续的 > 行归入同一个引用块，每行仍各自换行；空行才断开
          const previousBlock = blocks[blocks.length - 1];
          if (lastQuoteLineIndex === index - 1 && previousBlock?.type === "quote") {
            previousBlock.lines.push(quoteTokens);
            previousBlock.sourceEnd = lineOffsets[index] + line.length;
          } else {
            blocks.push({
              type: "quote",
              lines: [quoteTokens],
              sourceStart: lineOffsets[index],
              sourceEnd: lineOffsets[index] + line.length,
            });
          }
          lastQuoteLineIndex = index;
        } else if (listMarker) {
          const itemStart = trimmedStart + listMarker[0].length;
          const itemTokens = parseInlineSourceRange(
            normalized,
            itemStart,
            trimmedStart + trimmed.length,
            multilineUnderlines,
          );
          const bullet = {
            text: "• ",
            sourceStart: trimmedStart,
            sourceEnd: itemStart,
          };
          const bulletUnderline = multilineUnderlines
            .filter((marker) => marker.innerStart <= trimmedStart && itemStart <= marker.innerEnd)
            .sort((a, b) => (a.innerEnd - a.innerStart) - (b.innerEnd - b.innerStart))[0];
          if (bulletUnderline) bullet.underline = bulletUnderline.style;
          appendParagraphTokens([bullet, ...itemTokens], index, line);
        } else if (/^([-*_])(?:\s*\1){2,}\s*$/.test(trimmed)) {
          flushParagraph();
          blocks.push({ type: "spacer", sourceStart: lineOffsets[index], sourceEnd: lineOffsets[index] + line.length });
        } else {
          appendParagraphTokens(
            parseInlineSourceRange(
              normalized,
              trimmedStart,
              trimmedStart + trimmed.length,
              multilineUnderlines,
            ),
            index,
            line,
          );
        }
      }
    } else {
      flushParagraph();
      if (hasContentBeforeLine) {
        blocks.push({ type: "spacer", sourceStart: lineOffsets[index], sourceEnd: lineOffsets[index] });
      }
    }
  }

  flushParagraph();
  return blocks;
}

function splitMarkdownTableRow(line) {
  const value = String(line || "").trim();
  if (!value.includes("|")) return null;
  const cells = value.replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
  return cells.length > 1 ? cells : null;
}

function isMarkdownTableDivider(line) {
  const cells = splitMarkdownTableRow(line);
  return Boolean(cells?.length) && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isMarkdownTableHeader(line, nextLine) {
  return Boolean(splitMarkdownTableRow(line)?.length) && isMarkdownTableDivider(nextLine);
}

function countLeadingSpaces(text) {
  return text.match(/^\s*/)[0].length;
}

function applyInlineStyle(tokens, style) {
  return tokens.map((token) => {
    const next = { ...token };
    for (const [key, value] of Object.entries(style)) {
      if (next[key] === undefined) next[key] = value;
    }
    return next;
  });
}

function matchInlineMarker(text, i, kind) {
  const head = `{{${kind}:`;
  if (!text.startsWith(head, i)) return null;
  const colorEnd = text.indexOf("|", i + head.length);
  if (colorEnd === -1) return null;
  const color = text.slice(i + head.length, colorEnd);
  if (!/^#[0-9a-fA-F]{3,8}$/.test(color)) return null;
  const close = findMatchingMarkerClose(text, i);
  if (close === -1) return null;
  return { color, innerStart: colorEnd + 1, innerEnd: close - 2, end: close };
}

function normalizeInlineFontSize(value) {
  const size = Math.round(Number(value));
  if (!Number.isFinite(size)) return null;
  return clamp(size, INLINE_FONT_SIZE_MIN, INLINE_FONT_SIZE_MAX);
}

function matchSizeMarker(text, i) {
  const match = text.slice(i, i + 16).match(/^\{\{size:(\d{1,3})\|/);
  if (!match) return null;
  const size = normalizeInlineFontSize(match[1]);
  const close = findMatchingMarkerClose(text, i);
  if (!size || close === -1) return null;
  return {
    size,
    innerStart: i + match[0].length,
    innerEnd: close - 2,
    end: close,
  };
}

function matchUnderlineMarker(text, i) {
  const match = text.slice(i).match(/^\{\{underline:(solid|dashed)\|/);
  if (!match) return null;
  const close = findMatchingMarkerClose(text, i);
  if (close === -1) return null;
  return {
    style: match[1],
    innerStart: i + match[0].length,
    innerEnd: close - 2,
    end: close,
  };
}

function parseInline(text, baseStart = 0) {
  const tokens = [];
  let i = 0;

  while (i < text.length) {
    const imageMatch = text.slice(i).match(/^\[\[image:([\w-]+)\]\]/);
    if (imageMatch) {
      tokens.push({
        type: "image",
        imageId: imageMatch[1],
        sourceStart: baseStart + i,
        sourceEnd: baseStart + i + imageMatch[0].length,
      });
      i += imageMatch[0].length;
      continue;
    }

    // [文字](链接)：从 Obsidian 等处粘贴过来的超链接，此前会把方括号和整条
    // URL 原样显示出来。这里解析成文字，链接留给长文的 <a> 用。
    const linkMatch = text.slice(i).match(/^\[([^\[\]\n]+)\]\(((?:[^()\s]|\([^()\s]*\))*)(?:\s+"[^"]*")?\)/);
    if (linkMatch) {
      const href = /^(?:https?:|mailto:)/i.test(linkMatch[2]) ? linkMatch[2] : "";
      const inner = parseInline(linkMatch[1], baseStart + i + 1);
      tokens.push(...(href ? applyInlineStyle(inner, { link: href }) : inner));
      i += linkMatch[0].length;
      continue;
    }

    const underlineMatch = matchUnderlineMarker(text, i);
    if (underlineMatch) {
      tokens.push(
        ...applyInlineStyle(
          parseInline(text.slice(underlineMatch.innerStart, underlineMatch.innerEnd), baseStart + underlineMatch.innerStart),
          { underline: underlineMatch.style },
        ),
      );
      i = underlineMatch.end;
      continue;
    }

    const sizeMatch = matchSizeMarker(text, i);
    if (sizeMatch) {
      tokens.push(
        ...applyInlineStyle(
          parseInline(text.slice(sizeMatch.innerStart, sizeMatch.innerEnd), baseStart + sizeMatch.innerStart),
          { size: sizeMatch.size },
        ),
      );
      i = sizeMatch.end;
      continue;
    }

    const colorMatch = matchInlineMarker(text, i, "color");
    if (colorMatch) {
      tokens.push(
        ...applyInlineStyle(
          parseInline(text.slice(colorMatch.innerStart, colorMatch.innerEnd), baseStart + colorMatch.innerStart),
          { color: colorMatch.color },
        ),
      );
      i = colorMatch.end;
      continue;
    }

    const bgMatch = matchInlineMarker(text, i, "bg");
    if (bgMatch) {
      tokens.push(
        ...applyInlineStyle(
          parseInline(text.slice(bgMatch.innerStart, bgMatch.innerEnd), baseStart + bgMatch.innerStart),
          { bgColor: bgMatch.color },
        ),
      );
      i = bgMatch.end;
      continue;
    }

    if (text.startsWith("***", i)) {
      const close = text.indexOf("***", i + 3);
      if (close !== -1) {
        tokens.push(
          ...applyInlineStyle(
            parseInline(text.slice(i + 3, close), baseStart + i + 3),
            { bold: true, italic: true },
          ),
        );
        i = close + 3;
        continue;
      }
    }

    if (text.startsWith("**", i)) {
      const close = text.indexOf("**", i + 2);
      if (close !== -1) {
        tokens.push(...applyInlineStyle(parseInline(text.slice(i + 2, close), baseStart + i + 2), { bold: true }));
        i = close + 2;
        continue;
      }
    }

    if (text.startsWith("*", i)) {
      const close = text.indexOf("*", i + 1);
      if (close !== -1) {
        tokens.push(...applyInlineStyle(parseInline(text.slice(i + 1, close), baseStart + i + 1), { italic: true }));
        i = close + 1;
        continue;
      }
    }

    const nextMarkers = ["[[image:", "[", "{{underline:", "{{size:", "{{color:", "{{bg:", "***", "**", "*"]
      .map((marker) => text.indexOf(marker, i + 1))
      .filter((index) => index !== -1);
    const next = nextMarkers.length ? Math.min(...nextMarkers) : text.length;
    tokens.push({ text: text.slice(i, next), sourceStart: baseStart + i, sourceEnd: baseStart + next });
    i = next;
  }

  return tokens.filter((token) => token.type === "image" || token.text?.length > 0);
}

function styleForBlock(type, settings) {
  const baseSize = settings.fontSize;
  const fontSettings = {
    zhFont: settings.zhFont,
    enFont: settings.enFont,
  };
  if (type === "h1") {
    return {
      ...fontSettings,
      size: Math.round(baseSize * 1.36),
      lineHeight: 1.45,
      weight: 650,
      italic: false,
      marginTop: 22,
      marginBottom: 10,
      color: settings.textColor,
    };
  }
  if (type === "h2") {
    return {
      ...fontSettings,
      size: Math.round(baseSize * 1.12),
      lineHeight: 1.55,
      weight: 560,
      italic: false,
      marginTop: 20,
      marginBottom: 6,
      color: settings.textColor,
    };
  }
  if (type === "h3") {
    return {
      ...fontSettings,
      size: Math.round(baseSize * 1.02),
      lineHeight: 1.55,
      weight: 620,
      italic: false,
      marginTop: 16,
      marginBottom: 4,
      color: settings.textColor,
    };
  }
  if (type === "quote") {
    return {
      ...fontSettings,
      size: baseSize,
      lineHeight: settings.lineHeight,
      weight: CARD_BODY_FONT_WEIGHT,
      strokeWidth: CARD_BODY_STROKE_WIDTH,
      italic: false,
      marginTop: 18,
      marginBottom: 10,
      color: settings.textColor,
      quote: true,
    };
  }
  return {
    ...fontSettings,
    size: baseSize,
    lineHeight: settings.lineHeight,
    weight: CARD_BODY_FONT_WEIGHT,
    strokeWidth: CARD_BODY_STROKE_WIDTH,
    italic: false,
    marginTop: 16,
    marginBottom: 10,
    color: settings.textColor,
  };
}

function tokenFontSize(token, style) {
  return token?.size || style.size;
}

function fontString(style, token = {}) {
  const italic = token.italic || style.italic ? "italic " : "";
  const weight = token.bold ? Math.max(700, Number(style.weight) || CARD_BODY_FONT_WEIGHT) : style.weight;
  return `${italic}${weight} ${tokenFontSize(token, style)}px ${fontFamilyForText(token.text, style)}`;
}

function fontFamilyForText(text, settings) {
  const zhFont = FONT_STACKS[settings.zhFont] || FONT_STACKS["zh-system"];
  const enFont = FONT_STACKS[settings.enFont] || FONT_STACKS["en-system"];
  const emojiFont = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"';
  return /[A-Za-z0-9_@#%+./:-]/.test(text || "") ? `${enFont}, ${zhFont}, ${emojiFont}` : `${zhFont}, ${enFont}, ${emojiFont}`;
}

function splitTokenText(token) {
  const text = token.text || "";
  const segments = graphemeSegments(text);
  const units = [];
  let word = null;

  function flushWord() {
    if (!word) return;
    units.push(word);
    word = null;
  }

  for (const segment of segments) {
    if (/^[A-Za-z0-9_@#%+./:-]$/.test(segment.text)) {
      if (!word) word = { text: "", start: segment.start, end: segment.end };
      word.text += segment.text;
      word.end = segment.end;
      continue;
    }
    flushWord();
    units.push(segment);
  }

  flushWord();
  return units;
}

const graphemeSegmenter = window.Intl?.Segmenter ? new Intl.Segmenter("zh", { granularity: "grapheme" }) : null;

function graphemeSegments(text) {
  if (graphemeSegmenter) {
    return Array.from(graphemeSegmenter.segment(text), (part) => ({
      text: part.segment,
      start: part.index,
      end: part.index + part.segment.length,
    }));
  }

  const result = [];
  let index = 0;
  for (const char of Array.from(text)) {
    result.push({ text: char, start: index, end: index + char.length });
    index += char.length;
  }
  return result;
}

function isNoLineStartPunctuation(text) {
  return /^[,.;:!?，。！？；：、…）\])}】》〉」』”’"'、]+$/.test(text);
}

function isNoLineEndPunctuation(text) {
  return /^[（\[(【《〈「『“‘"']+$/.test(text);
}

function wrapTokens(ctx, tokens, style, maxWidth) {
  const lines = [];
  let line = [];
  let width = 0;

  function pushLine() {
    while (line.length && /^\s+$/.test(line[0].text)) {
      width -= measureToken(ctx, line[0], style);
      line.shift();
    }
    while (line.length && /^\s+$/.test(line[line.length - 1].text)) {
      width -= measureToken(ctx, line[line.length - 1], style);
      line.pop();
    }
    if (line.length) lines.push(line);
    line = [];
    width = 0;
  }

  for (const token of tokens) {
    for (const unit of splitTokenText(token)) {
      const part = {
        ...token,
        text: unit.text,
        sourceStart: token.sourceStart + unit.start,
        sourceEnd: token.sourceStart + unit.end,
      };
      const measured = measureToken(ctx, part, style);
      const shouldStayWithPrevious = isNoLineStartPunctuation(unit.text);
      const previousText = line.length ? line[line.length - 1].text : "";
      const previousNeedsNext = isNoLineEndPunctuation(previousText);

      if (width + measured > maxWidth && line.length && !shouldStayWithPrevious && !previousNeedsNext) {
        pushLine();
      }
      if (!line.length && /^\s+$/.test(unit.text)) continue;
      if (!line.length && shouldStayWithPrevious && lines.length) {
        lines[lines.length - 1].push(part);
        continue;
      }
      line.push(part);
      width += measured;
    }
  }

  pushLine();
  return lines;
}

function wrapBlockLines(ctx, block, style, maxWidth) {
  if (!block.lines) return wrapTokens(ctx, block.tokens, style, maxWidth);
  const lines = [];
  for (const sourceLine of block.lines) {
    lines.push(...wrapTokens(ctx, sourceLine, style, maxWidth));
  }
  return lines;
}

function buildTableLayout(ctx, block, settings, maxWidth) {
  const columns = Math.max(1, block.header.length, ...block.rows.map((row) => row.length));
  const cellWidth = maxWidth / columns;
  const headerStyle = {
    ...styleForBlock("h3", settings),
    size: Math.max(18, Math.round(settings.fontSize * 0.76)),
    lineHeight: 1.35,
  };
  const bodyStyle = {
    ...styleForBlock("p", settings),
    size: Math.max(17, Math.round(settings.fontSize * 0.72)),
    lineHeight: 1.4,
  };
  const rowPadding = 10;
  const makeRow = (cells, style) => {
    const lines = Array.from({ length: columns }, (_, index) => wrapTokens(ctx, cells[index] || [], style, Math.max(34, cellWidth - rowPadding * 2)));
    const lineHeight = Math.max(
      Math.ceil(style.size * style.lineHeight),
      ...lines.flat().map((line) => lineHeightForTokens(line, style)),
    );
    return {
      cells: lines,
      style,
      lineHeight,
      height: Math.max(lineHeight, ...lines.map((cellLines) => cellLines.length * lineHeight)) + rowPadding * 2,
    };
  };
  const rows = [makeRow(block.header, headerStyle), ...block.rows.map((row) => makeRow(row, bodyStyle))];
  return {
    columns,
    cellWidth,
    rows,
    height: rows.reduce((total, row) => total + row.height, 0),
  };
}

function blankLineGap(settings) {
  return Math.max(18, Math.ceil(settings.fontSize * 0.8));
}

function tokenLetterSpacing(token, style) {
  if (!token?.text || /^\s+$/.test(token.text)) return 0;
  return Math.max(0.8, tokenFontSize(token, style) * 0.025);
}

// 行内字号比所在块大时，这一行需要撑高，否则会压到上下行。
function lineHeightForTokens(line, style) {
  const base = Math.ceil(style.size * style.lineHeight);
  const largest = line.reduce((max, token) => Math.max(max, token.size || 0), 0);
  return largest > style.size ? Math.max(base, Math.ceil(largest * style.lineHeight)) : base;
}

function glyphWidth(ctx, token, style) {
  ctx.font = fontString(style, token);
  return ctx.measureText(token.text).width;
}

function measureToken(ctx, token, style) {
  return glyphWidth(ctx, token, style) + tokenLetterSpacing(token, style);
}

function getImageSourceRect(image, crop) {
  return clampCropRect(crop, image);
}

function imageBlockSize(sourceRect, maxWidth, maxHeight, layout = null) {
  const normalized = normalizeImageLayout(layout);
  const aspect = sourceRect.width / sourceRect.height;
  const baseWidth = Math.min(maxWidth, maxHeight * aspect);
  const legacyMaxScale = baseWidth > 0 ? maxWidth / baseWidth : 1;
  const fixedWidth = normalized.fixedWidth && normalized.fixedHeight ? clamp(normalized.fixedWidth, 80, maxWidth) : null;
  const fixedHeight = normalized.fixedWidth && normalized.fixedHeight ? clamp(normalized.fixedHeight, 80, maxHeight) : null;
  let width = fixedWidth || (normalized.widthPercent
    ? maxWidth * (normalized.widthPercent / 100)
    : baseWidth * clamp(normalized.widthScale, 0.25, legacyMaxScale));
  let height = fixedHeight || width / aspect;
  const fitScale = Math.min(1, maxWidth / Math.max(1, width), maxHeight / Math.max(1, height));
  width *= fitScale;
  height *= fitScale;
  const maxOffset = Math.max(0, maxWidth - width);
  let offsetX = maxOffset / 2;

  if (normalized.align === "left") {
    offsetX = 0;
  } else if (normalized.align === "right") {
    offsetX = maxOffset;
  }

  return {
    width,
    height,
    offsetX,
    baseWidth,
    maxWidth,
    resizeMaxWidth: baseWidth,
  };
}

function normalizeImageLayout(layout = {}) {
  const value = layout || {};
  const align = ["left", "center", "right"].includes(value.align) ? value.align : "center";
  const rawPercent = Number(value.widthPercent);
  const widthPercent = Number.isFinite(rawPercent) && rawPercent > 0 ? clamp(rawPercent, 25, 100) : null;
  const rawFixedWidth = Number(value.fixedWidth);
  const rawFixedHeight = Number(value.fixedHeight);
  const fixedWidth = Number.isFinite(rawFixedWidth) && rawFixedWidth > 0 ? clamp(rawFixedWidth, 80, CARD_CONTENT_WIDTH) : null;
  const fixedHeight = Number.isFinite(rawFixedHeight) && rawFixedHeight > 0 ? clamp(rawFixedHeight, 80, CARD_MAX_IMAGE_HEIGHT) : null;
  return {
    widthScale: clamp(Number(value.widthScale) || 1, 0.25, 20),
    widthPercent,
    fixedWidth,
    fixedHeight,
    align,
  };
}

function imageMaxHeightForLayout(layout, fallbackMaxHeight, absoluteMaxHeight = fallbackMaxHeight) {
  const normalized = normalizeImageLayout(layout);
  if (!normalized.fixedHeight) return fallbackMaxHeight;
  return clamp(normalized.fixedHeight, 80, Math.max(80, absoluteMaxHeight));
}

function contentBoundsForHeader(showHeader) {
  return {
    left: CARD_SIDE_PADDING,
    right: CANVAS_WIDTH - CARD_SIDE_PADDING,
    top: showHeader ? 158 : CARD_SIDE_PADDING,
    bottom: CARD_CONTENT_BOTTOM,
  };
}

async function buildPages(settings) {
  const measureCanvas = document.createElement("canvas");
  const ctx = measureCanvas.getContext("2d");
  const blocks = parseBlocks(settings.content, settings.images);
  const avatar = await loadImage(settings.avatar).catch(() => null);
  const badge = await loadImage(verifiedBadgeSrc).catch(() => null);
  const imageCache = {};
  const pages = [];
  let page = createPage();
  const contentWidth = page.bounds.right - page.bounds.left;
  let y = page.bounds.top;
  let hasContent = false;
  let previousBlockType = null;

  function createPage() {
    const showHeader = settings.headerMode !== "first" || pages.length === 0;
    const bounds = contentBoundsForHeader(showHeader);
    return {
      avatar,
      badge,
      settings,
      showHeader,
      bounds,
      items: [],
    };
  }

  function finishPage() {
    if (page.items.length) {
      pages.push(page);
    }
    page = createPage();
    y = page.bounds.top;
    hasContent = false;
    previousBlockType = null;
  }

  function ensureSpace(height, topMargin = 0) {
    if (hasContent && y + topMargin + height > page.bounds.bottom) {
      finishPage();
    }
    if (!hasContent) topMargin = 0;
    y += topMargin;
  }

  for (const block of blocks) {
    if (block.type === "spacer") {
      const spacerHeight = blankLineGap(settings);
      ensureSpace(spacerHeight, 0);
      y += spacerHeight;
      previousBlockType = "spacer";
      continue;
    }

    if (block.type === "table") {
      const table = buildTableLayout(ctx, block, settings, contentWidth);
      ensureSpace(table.height, hasContent && previousBlockType !== "spacer" ? 18 : 0);
      page.items.push({ type: "table", x: page.bounds.left, y, width: contentWidth, table, sourceStart: block.sourceStart, sourceEnd: block.sourceEnd });
      y += table.height + 18;
      hasContent = true;
      previousBlockType = "table";
      continue;
    }

    if (block.type === "imagePair") {
      const cells = [];
      for (const id of block.ids) {
        const data = settings.images[id];
        if (!data) continue;
        if (!imageCache[id]) {
          imageCache[id] = await loadImage(data.src).catch(() => null);
        }
        const img = imageCache[id];
        if (!img) continue;
        cells.push({ imageId: id, image: img, sourceRect: getImageSourceRect(img, data.crop) });
      }
      if (!cells.length) continue;
      // 拼图整体按 ratio 定高，两格等分，中缝露出卡片背景色；
      // 超过最大图高时保持比例缩小并水平居中
      const pairAspect = PAIR_RATIOS[normalizePairRatio(block.ratio)];
      let pairWidth = contentWidth;
      let pairHeight = Math.round(pairWidth / pairAspect);
      const pairMaxHeight = Math.min(settings.imageHeight, page.bounds.bottom - page.bounds.top);
      if (pairHeight > pairMaxHeight) {
        pairHeight = pairMaxHeight;
        pairWidth = Math.round(pairHeight * pairAspect);
      }
      ensureSpace(pairHeight, hasContent && previousBlockType !== "spacer" ? 24 : 0);
      page.items.push({
        type: "imagePair",
        cells,
        x: page.bounds.left + Math.round((contentWidth - pairWidth) / 2),
        y,
        width: pairWidth,
        height: pairHeight,
        gap: 5,
        radius: 13,
        sourceStart: block.sourceStart,
        sourceEnd: block.sourceEnd,
      });
      y += pairHeight + 34;
      hasContent = true;
      previousBlockType = "image";
      continue;
    }

    if (block.type === "image") {
      const data = settings.images[block.id];
      if (!data) continue;
      if (!imageCache[block.id]) {
        imageCache[block.id] = await loadImage(data.src).catch(() => null);
      }
      const img = imageCache[block.id];
      if (!img) continue;
      const sourceRect = getImageSourceRect(img, data.crop);
      const size = imageBlockSize(sourceRect, contentWidth, imageMaxHeightForLayout(data.layout, Math.min(settings.imageHeight, page.bounds.bottom - page.bounds.top), page.bounds.bottom - page.bounds.top), data.layout);
      const height = size.height;
      ensureSpace(height, hasContent && previousBlockType !== "spacer" ? 24 : 0);
      page.items.push({
        type: "image",
        imageId: block.id,
        image: img,
        sourceRect,
        baseWidth: size.baseWidth,
        maxWidth: size.maxWidth,
        x: page.bounds.left + size.offsetX,
        y,
        width: size.width,
        height,
        radius: 13,
        resizeMaxWidth: size.resizeMaxWidth,
        sourceStart: block.sourceStart,
        sourceEnd: block.sourceEnd,
      });
      y += height + 34;
      hasContent = true;
      previousBlockType = "image";
      continue;
    }

    const style = styleForBlock(block.type, settings);
    const textWidth = style.quote ? contentWidth - 28 : contentWidth;
    const lines = wrapBlockLines(ctx, block, style, textWidth);
    let firstLine = true;

    for (const line of lines) {
      const lineHeight = lineHeightForTokens(line, style);
      const topMargin = firstLine ? (hasContent && previousBlockType !== "spacer" ? style.marginTop : 0) : 0;
      ensureSpace(lineHeight, topMargin);
      page.items.push({
        type: "text",
        blockType: block.type,
        line,
        style,
        x: page.bounds.left + (style.quote ? 28 : 0),
        y,
        lineHeight,
        quoteBlock: style.quote ? block : null,
        sourceStart: line.find((token) => Number.isFinite(token.sourceStart))?.sourceStart ?? block.sourceStart,
        sourceEnd: [...line].reverse().find((token) => Number.isFinite(token.sourceEnd))?.sourceEnd ?? block.sourceEnd,
      });
      y += lineHeight;
      firstLine = false;
      hasContent = true;
    }

    if (lines.length) {
      y += style.marginBottom;
      previousBlockType = block.type;
    }
  }

  finishPage();
  return pages.length ? pages : [createPage()];
}

function renderPage(page, index, total) {
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_CANVAS_WIDTH;
  canvas.height = OUTPUT_CANVAS_HEIGHT;
  canvas.dataset.page = String(index + 1);
  canvas._page = page;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.setTransform(CANVAS_RENDER_SCALE, 0, 0, CANVAS_RENDER_SCALE, 0, 0);
  drawPageToContext(ctx, page, index, total);
  canvas._imageHits = collectImageHits(page);
  canvas._imageDropTargets = collectImageDropTargets(page);
  return canvas;
}

function drawPageToContext(ctx, page, index, total) {
  drawBackground(ctx, page.settings);
  if (page.showHeader !== false) {
    drawHeader(ctx, page.settings, page.avatar, page.badge);
  }
  drawFooter(ctx, page.settings, index, total);
  drawQuoteBars(ctx, page);

  for (const item of page.items) {
    if (item.type === "image") drawImageBlock(ctx, item);
    if (item.type === "imagePair") drawImagePairBlock(ctx, item);
    if (item.type === "table") drawTableBlock(ctx, item, page.settings);
    if (item.type === "text") drawTextLine(ctx, item);
  }
}

// 同一引用块在本页的所有行共用一根竖条；跨页时每页各画一段
function drawQuoteBars(ctx, page) {
  const bars = new Map();
  for (const item of page.items) {
    if (item.type !== "text" || !item.quoteBlock) continue;
    const bar = bars.get(item.quoteBlock);
    if (bar) {
      bar.bottom = item.y + item.lineHeight;
    } else {
      bars.set(item.quoteBlock, { x: item.x, top: item.y, bottom: item.y + item.lineHeight });
    }
  }
  ctx.fillStyle = page.settings.accentColor;
  for (const bar of bars.values()) {
    roundedRect(ctx, bar.x - 28, bar.top + 7, 7, bar.bottom - bar.top - 13, 4);
    ctx.fill();
  }
}

function collectImageHits(page) {
  return page.items
    .filter((item) => item.type === "image" && item.imageId)
    .map((item) => ({
      imageId: item.imageId,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      baseWidth: item.baseWidth || item.width,
      maxWidth: item.maxWidth || CARD_CONTENT_WIDTH,
      resizeMaxWidth: item.resizeMaxWidth || item.baseWidth || item.width,
      sourceStart: item.sourceStart,
      sourceEnd: item.sourceEnd,
    }))
    .filter((hit) => hit.height > 0 && hit.width > 0);
}

function collectImageDropTargets(page) {
  return page.items
    .filter((item) => Number.isFinite(item.sourceStart) && Number.isFinite(item.sourceEnd))
    .map((item) => {
      const rawHeight = item.type === "table" ? item.table.height : item.type === "text" ? item.lineHeight : item.height;
      return {
        imageId: item.imageId || "",
        targetKind: item.type === "text" && item.blockType === "p" ? "text-line" : "block",
        y: item.y,
        height: rawHeight,
        sourceStart: item.sourceStart,
        sourceEnd: item.sourceEnd,
      };
    })
    .filter((target) => target.height > 0);
}

function normalizeBgPattern(value) {
  return CARD_BG_PATTERNS.includes(value) ? value : "none";
}

function hexToRgb(hex) {
  const match = String(hex || "").match(/^#?([0-9a-fA-F]{6})$/);
  if (!match) return null;
  const value = Number.parseInt(match[1], 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function rgbaFromHex(hex, alpha) {
  const rgb = hexToRgb(hex) || { r: 32, g: 41, b: 56 };
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

// 渐变的另一端由背景色转动色相得到，这样用户改了背景色，渐变也跟着变。
function gradientPartnerColor(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (!delta) return hex;
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  hue = (hue * 60 + 360 - 60) % 360;
  return `hsl(${Math.round(hue)}, ${Math.round(saturation * 100)}%, ${Math.round(lightness * 100)}%)`;
}

function drawBackground(ctx, settings) {
  const pattern = normalizeBgPattern(settings.bgPattern);
  if (pattern === "gradient") {
    const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    gradient.addColorStop(0, settings.bgColor);
    gradient.addColorStop(1, gradientPartnerColor(settings.bgColor));
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = settings.bgColor;
  }
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.save();
  if (pattern === "grid") {
    const cell = 36;
    ctx.strokeStyle = rgbaFromHex(settings.textColor, 0.07);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = cell; x < CANVAS_WIDTH; x += cell) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, CANVAS_HEIGHT);
    }
    for (let y = cell; y < CANVAS_HEIGHT; y += cell) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(CANVAS_WIDTH, y + 0.5);
    }
    ctx.stroke();
  } else if (pattern === "lines") {
    const gap = 48;
    ctx.strokeStyle = rgbaFromHex(settings.textColor, 0.1);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = gap; y < CANVAS_HEIGHT; y += gap) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(CANVAS_WIDTH, y + 0.5);
    }
    ctx.stroke();
  } else if (pattern === "dots") {
    const gap = 28;
    ctx.fillStyle = rgbaFromHex(settings.textColor, 0.16);
    for (let y = gap; y < CANVAS_HEIGHT; y += gap) {
      for (let x = gap; x < CANVAS_WIDTH; x += gap) {
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

function drawHeader(ctx, settings, avatar, badge) {
  const x = 42;
  const y = 38;
  const size = 82;
  const darkCard = isDarkHexColor(settings.bgColor);

  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();
  if (avatar) {
    drawSourceCoverImage(ctx, avatar, getImageSourceRect(avatar, settings.avatarCrop), x, y, size, size);
  } else {
    ctx.fillStyle = "#d8edc0";
    ctx.fillRect(x, y, size, size);
  }
  ctx.restore();

  ctx.lineWidth = 2;
  ctx.strokeStyle = darkCard ? "rgba(255,255,255,.2)" : "rgba(32,41,56,.12)";
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.stroke();

  const textX = 152;
  ctx.fillStyle = settings.textColor;
  ctx.font = `650 30px ${fontFamilyForText(settings.displayName, settings)}`;
  ctx.textBaseline = "alphabetic";
  const name = clampText(ctx, settings.displayName, 430);
  ctx.fillText(name, textX, 72);

  const nameWidth = ctx.measureText(name).width;
  drawVerifiedBadge(ctx, badge, textX + nameWidth + 24, 59);

  ctx.fillStyle = darkCard ? "rgba(255,255,255,.72)" : "#6f7785";
  ctx.font = `400 29px ${fontFamilyForText(settings.handle, settings)}`;
  ctx.fillText(clampText(ctx, settings.handle, 480), textX, 113);

  ctx.fillStyle = darkCard ? "rgba(255,255,255,.5)" : "#9aa2af";
  ctx.font = `400 26px ${fontFamilyForText("0", settings)}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(formatCardDate(new Date()), CANVAS_WIDTH - CARD_SIDE_PADDING, 79);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function formatCardDate(date) {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function drawFooter(ctx, settings, index, total) {
  const darkCard = isDarkHexColor(settings.bgColor);
  const left = CARD_SIDE_PADDING;
  const right = CANVAS_WIDTH - CARD_SIDE_PADDING;

  ctx.save();
  ctx.strokeStyle = darkCard ? "rgba(255,255,255,.16)" : "rgba(32,41,56,.12)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(left, CARD_FOOTER_DIVIDER_Y);
  ctx.lineTo(right, CARD_FOOTER_DIVIDER_Y);
  ctx.stroke();

  ctx.fillStyle = darkCard ? "rgba(255,255,255,.5)" : "#9aa2af";
  ctx.textBaseline = "middle";
  const pageLabel = `${index + 1}/${total}`;
  ctx.font = `400 24px ${fontFamilyForText(pageLabel, settings)}`;
  ctx.textAlign = "right";
  ctx.fillText(pageLabel, right, CARD_FOOTER_TEXT_Y);
  const pageLabelWidth = ctx.measureText(pageLabel).width;

  const title = projectTitleFromData(settings);
  ctx.font = `400 24px ${fontFamilyForText(title, settings)}`;
  ctx.textAlign = "left";
  ctx.fillText(clampText(ctx, title, right - left - pageLabelWidth - 40), left, CARD_FOOTER_TEXT_Y);
  ctx.restore();
}

function isDarkHexColor(hex) {
  const match = String(hex || "").match(/^#?([0-9a-fA-F]{6})$/);
  if (!match) return false;
  const value = match[1];
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000 < 128;
}

function drawVerifiedBadge(ctx, badge, x, y) {
  ctx.save();
  if (badge) {
    const size = 34;
    ctx.drawImage(badge, x - size / 2, y - size / 2, size, size);
  } else {
    ctx.fillStyle = "#1d9bf0";
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4.7;
    ctx.lineCap = "square";
    ctx.lineJoin = "miter";
    ctx.beginPath();
    ctx.moveTo(x - 8.4, y - 0.7);
    ctx.lineTo(x - 2.2, y + 5.8);
    ctx.lineTo(x + 9.6, y - 8);
    ctx.stroke();
  }
  ctx.restore();
}

function drawImageBlock(ctx, item) {
  ctx.save();
  roundedRect(ctx, item.x, item.y, item.width, item.height, item.radius);
  ctx.clip();
  drawSourceCoverImage(ctx, item.image, item.sourceRect, item.x, item.y, item.width, item.height);
  ctx.restore();
}

// 双图拼图：外框整体圆角，内部左右两格 cover 裁剪，中缝露背景
function drawImagePairBlock(ctx, item) {
  ctx.save();
  roundedRect(ctx, item.x, item.y, item.width, item.height, item.radius);
  ctx.clip();
  const count = item.cells.length;
  const slotWidth = (item.width - item.gap * (count - 1)) / count;
  item.cells.forEach((cell, index) => {
    const x = item.x + index * (slotWidth + item.gap);
    drawSourceCoverImage(ctx, cell.image, cell.sourceRect, x, item.y, slotWidth, item.height);
  });
  ctx.restore();
}

function drawTableBlock(ctx, item, settings) {
  const { table } = item;
  let y = item.y;
  const darkCard = isDarkHexColor(settings.bgColor);
  ctx.save();
  for (const [rowIndex, row] of table.rows.entries()) {
    if (rowIndex === 0) {
      ctx.fillStyle = darkCard ? "rgba(255,255,255,.16)" : "rgba(43,127,216,.13)";
      ctx.fillRect(item.x, y, item.width, row.height);
    }
    for (let column = 0; column < table.columns; column += 1) {
      const x = item.x + column * table.cellWidth;
      ctx.strokeStyle = darkCard ? "rgba(255,255,255,.24)" : "rgba(32,41,56,.18)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, table.cellWidth, row.height);
      let lineY = y + 10;
      for (const line of row.cells[column]) {
        drawTextLine(ctx, {
          style: row.style,
          line,
          x: x + 10,
          y: lineY,
          lineHeight: row.lineHeight,
        });
        lineY += row.lineHeight;
      }
    }
    y += row.height;
  }
  ctx.restore();
}

function drawUnderlineRun(ctx, run, style, baseline) {
  if (!run || run.end <= run.start) return;
  ctx.save();
  ctx.strokeStyle = run.color;
  ctx.lineWidth = Math.max(2.4, Math.round(style.size * 0.07 * 10) / 10);
  ctx.lineCap = run.style === "dashed" ? "round" : "butt";
  if (run.style === "dashed") {
    const dash = Math.max(3, Math.round(style.size * 0.18));
    ctx.setLineDash([dash, Math.max(2, Math.round(dash * 0.72))]);
  }
  ctx.beginPath();
  ctx.moveTo(run.start, baseline + UNDERLINE_GAP);
  ctx.lineTo(run.end, baseline + UNDERLINE_GAP);
  ctx.stroke();
  ctx.restore();
}

function drawTextLine(ctx, item) {
  const { style, line, x, y, lineHeight } = item;
  let cursor = x;
  const baseline = y + Math.round(lineHeight * 0.75);
  let underlineRun = null;
  const flushUnderlineRun = () => {
    drawUnderlineRun(ctx, underlineRun, style, baseline);
    underlineRun = null;
  };
  for (const token of line) {
    ctx.font = fontString(style, token);
    const width = glyphWidth(ctx, token, style);
    if (token.bgColor) {
      // 按本 token 的字号算高亮块，行被大字号撑高时小字的底色不会跟着变高。
      const tokenLineHeight = token.size ? Math.ceil(token.size * style.lineHeight) : lineHeight;
      ctx.fillStyle = token.bgColor;
      roundedRect(ctx, cursor - 3, baseline - Math.round(tokenLineHeight * 0.61), width + 6, Math.round(tokenLineHeight * 0.72), 7);
      ctx.fill();
    }
    const textColor = token.color || style.color;
    if (style.strokeWidth && !token.bold) {
      ctx.save();
      ctx.strokeStyle = textColor;
      ctx.lineWidth = style.strokeWidth;
      ctx.lineJoin = "round";
      ctx.strokeText(token.text, cursor, baseline);
      ctx.restore();
    }
    ctx.fillStyle = textColor;
    ctx.fillText(token.text, cursor, baseline);
    const nextCursor = cursor + width + tokenLetterSpacing(token, style);
    if (token.underline) {
      if (
        underlineRun
        && underlineRun.style === token.underline
        && underlineRun.color === textColor
        && underlineRun.end === cursor
      ) {
        underlineRun.end = nextCursor;
      } else {
        flushUnderlineRun();
        underlineRun = { style: token.underline, color: textColor, start: cursor, end: nextCursor };
      }
    } else {
      flushUnderlineRun();
    }
    cursor = nextCursor;
  }
  flushUnderlineRun();
}

function drawCoverImage(ctx, image, x, y, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const dx = x + (width - drawWidth) / 2;
  const dy = y + (height - drawHeight) / 2;
  ctx.drawImage(image, dx, dy, drawWidth, drawHeight);
}

function drawSourceImage(ctx, image, sourceRect, x, y, width, height) {
  ctx.drawImage(image, sourceRect.x, sourceRect.y, sourceRect.width, sourceRect.height, x, y, width, height);
}

function drawSourceCoverImage(ctx, image, sourceRect, x, y, width, height) {
  const sourceAspect = sourceRect.width / sourceRect.height;
  const destAspect = width / height;
  let sx = sourceRect.x;
  let sy = sourceRect.y;
  let sw = sourceRect.width;
  let sh = sourceRect.height;

  if (sourceAspect > destAspect) {
    sw = sourceRect.height * destAspect;
    sx = sourceRect.x + (sourceRect.width - sw) / 2;
  } else {
    sh = sourceRect.width / destAspect;
    sy = sourceRect.y + (sourceRect.height - sh) / 2;
  }
  ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function clampText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}...`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}...`;
}

function renderArticlePreview(settings) {
  state.canvases = [];
  els.pages.innerHTML = "";
  els.pages.className = "pages article-mode";
  els.articleSettings.hidden = false;

  applyArticleThemeStyle(settings);
  const article = document.createElement("article");
  article.className = "article-preview";
  article.style.setProperty("--article-underline-gap", `${UNDERLINE_GAP}px`);
  article.style.setProperty("--card-font-size", String(settings.fontSize || DEFAULT_CARD_FONT_SIZE));
  article.innerHTML = markdownToArticleHtml(settings.content, settings.images, settings);
  hydrateArticleLiveMedia(article, settings.images);
  els.pages.append(article);

  const wordCount = settings.content.replace(/\s/g, "").length;
  els.pageCount.textContent = "长文";
  els.status.textContent = `已生成长文预览，约 ${wordCount} 字`;
  syncExportBusyState();
  if (window.lucide) window.lucide.createIcons();
}

// 输出结构和 markdown-nice 一致，它的主题才能直接套用：标题里有 .prefix/.content/.suffix 三个 span，
// 列表项包一层 section，代码块是 pre.custom > code.hljs。
function markdownToArticleHtml(markdown, images = {}, { articleMacCode = true } = {}) {
  const normalized = String(markdown || "").replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const lineOffsets = [];
  let runningOffset = 0;
  lines.forEach((line) => {
    lineOffsets.push(runningOffset);
    runningOffset += line.length + 1;
  });
  const multilineUnderlines = collectMultilineUnderlineMarkers(normalized);
  const imageLookup = buildImageReferenceLookup(images);
  const html = [];
  let paragraph = [];
  let list = [];
  let quote = [];
  let code = [];
  let codeLang = "";
  let inCode = false;

  const renderSourceRange = (start, end) => renderArticleInlineTokens(
    parseInlineSourceRange(normalized, start, end, multilineUnderlines),
  );

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${renderSourceRange(paragraph[0].start, paragraph[paragraph.length - 1].end)}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    html.push(`<ul>${list.map((item) => `<li><section>${renderSourceRange(item.start, item.end)}</section></li>`).join("")}</ul>`);
    list = [];
  };
  // 连续的 > 行合成一个 blockquote，行与行之间保留换行
  const flushQuote = () => {
    if (!quote.length) return;
    html.push(`<blockquote><p>${quote.map((item) => renderSourceRange(item.start, item.end)).join("<br>")}</p></blockquote>`);
    quote = [];
  };
  const flushCode = () => {
    if (!code.length) return;
    html.push(renderArticleCodeBlock(code.join("\n"), codeLang, articleMacCode));
    code = [];
  };

  const flushTable = (header, rows) => {
    html.push(`<div class="article-table-wrap"><table><thead><tr>${header.map((cell) => `<th>${renderArticleInline(cell)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${header.map((_, index) => `<td>${renderArticleInline(row[index] || "")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const leading = line.match(/^\s*/)?.[0].length || 0;
    const trailing = line.match(/\s*$/)?.[0].length || 0;
    const trimmed = line.trim();
    const trimmedStart = lineOffsets[index] + leading;
    const trimmedEnd = lineOffsets[index] + line.length - trailing;
    if (!trimmed.startsWith("> ")) flushQuote();
    if (trimmed.startsWith("```")) {
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        inCode = true;
        codeLang = trimmed.slice(3).trim().split(/\s+/)[0].toLowerCase();
      }
      continue;
    }
    if (inCode) {
      code.push(line);
      continue;
    }
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    if (isMarkdownTableHeader(trimmed, lines[index + 1])) {
      flushParagraph();
      flushList();
      const header = splitMarkdownTableRow(trimmed);
      const rows = [];
      let rowIndex = index + 2;
      while (rowIndex < lines.length) {
        const row = splitMarkdownTableRow(lines[rowIndex].trim());
        if (!row) break;
        rows.push(row);
        rowIndex += 1;
      }
      flushTable(header, rows);
      index = rowIndex - 1;
      continue;
    }

    const imageId = resolveMarkdownImageBlock(trimmed, imageLookup);
    if (isMarkdownImageBlock(trimmed)) {
      flushParagraph();
      flushList();
      const image = images[imageId];
      if (image?.src && image.kind === "live") {
        html.push(
          `<figure class="article-live-figure" data-live-image-id="${escapeAttribute(imageId)}">` +
          `<div class="article-live-stage"><img src="${escapeAttribute(image.src)}" alt="${escapeAttribute(image.name || "实况图片")}" /></div>` +
          `</figure>`,
        );
      } else if (image?.src) {
        html.push(`<figure><img src="${escapeAttribute(image.src)}" alt="${escapeAttribute(image.name || "图片")}" /></figure>`);
      }
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      const contentStart = trimmedStart + heading[0].length - heading[2].length;
      html.push(
        `<h${level}><span class="prefix"></span><span class="content">${renderSourceRange(contentStart, trimmedEnd)}</span>` +
        `<span class="suffix"></span></h${level}>`,
      );
      continue;
    }

    if (trimmed.startsWith("> ")) {
      flushParagraph();
      flushList();
      quote.push({ start: trimmedStart + 2, end: trimmedEnd });
      continue;
    }

    const listMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      const markerLength = trimmed.length - listMatch[1].length;
      list.push({ start: trimmedStart + markerLength, end: trimmedEnd });
      continue;
    }

    paragraph.push({ start: trimmedStart, end: trimmedEnd });
  }

  flushParagraph();
  flushList();
  flushQuote();
  flushCode();
  return html.length ? html.join("") : '<p class="article-empty">在左侧输入 Markdown，右侧会生成长文预览。</p>';
}

const ARTICLE_CODE_QUOTED = String.raw`"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'`;
const ARTICLE_CODE_C_COMMENT = String.raw`\/\/.*|\/\*[\s\S]*?\*\/`;
const ARTICLE_CODE_C_KEYWORDS =
  "auto break case catch chan char class const constexpr continue default defer delete do double else enum explicit " +
  "extern final float fn for func go goto if impl import inline int interface let long loop map match mod mut namespace " +
  "new override package private protected pub public range return select short signed sizeof static struct super switch " +
  "template this throw trait try type typedef typename union unsigned use using var virtual void volatile where while " +
  "__global__ __device__ __host__ __shared__";
const ARTICLE_CODE_SPECS = {
  python: {
    label: "Python",
    comment: String.raw`#.*`,
    string: String.raw`(?:\b[rRbBfFuU]{1,2})?(?:"""[\s\S]*?"""|'''[\s\S]*?'''|${ARTICLE_CODE_QUOTED})`,
    extra: String.raw`@[\w.]+`,
    extraKind: "decorator",
    keywords: "and as assert async await break case class continue def del elif else except finally for from global if " +
      "import in is lambda match nonlocal not or pass raise return try while with yield",
    constants: "True False None self cls",
  },
  javascript: {
    label: "JavaScript",
    comment: ARTICLE_CODE_C_COMMENT,
    string: String.raw`${ARTICLE_CODE_QUOTED}|\x60(?:\\.|[^\x60\\])*\x60`,
    keywords: "as async await break case catch class const continue default delete do else export extends finally for " +
      "from function if import in instanceof interface let new of return static super switch this throw try type " +
      "typeof var void while yield",
    constants: "true false null undefined NaN",
  },
  c: {
    label: "C/C++",
    comment: ARTICLE_CODE_C_COMMENT,
    string: ARTICLE_CODE_QUOTED,
    extra: String.raw`^\s*#\s*\w+`,
    extraKind: "decorator",
    keywords: ARTICLE_CODE_C_KEYWORDS,
    constants: "true false nil null nullptr NULL None Some Ok Err self",
  },
  shell: {
    label: "Bash",
    comment: String.raw`(?<![^\s])#.*`,
    string: ARTICLE_CODE_QUOTED,
    extra: String.raw`(?<![^\s])--?[A-Za-z][\w-]*|\$\{?\w+\}?`,
    extraKind: "attr",
    // 命令行里 Llama-3-8B、v0.11 这类名字中的数字不着色。
    number: String.raw`(?<![^\s=:,(])\d+(?:\.\d+)?(?![\w.-])`,
    keywords: "case do done elif else esac export fi for function if in local return then while",
    constants: "true false",
  },
  json: { label: "JSON", comment: "(?!)", string: ARTICLE_CODE_QUOTED, keys: true, keywords: "", constants: "true false null" },
  yaml: { label: "YAML", comment: String.raw`(?<![^\s])#.*`, string: ARTICLE_CODE_QUOTED, keywords: "", constants: "true false null yes no" },
  sql: {
    label: "SQL",
    comment: String.raw`--.*`,
    string: ARTICLE_CODE_QUOTED,
    caseInsensitive: true,
    keywords: "and as asc by case create delete desc distinct drop else end from group having in index insert into is " +
      "join left limit not on or order outer right select set table then union update values when where with",
    constants: "null true false",
  },
};
const ARTICLE_CODE_ALIASES = {
  py: "python", python3: "python", js: "javascript", jsx: "javascript", mjs: "javascript", ts: "javascript",
  tsx: "javascript", typescript: "javascript", cpp: "c", "c++": "c", cc: "c", h: "c", hpp: "c", cuda: "c", cu: "c",
  java: "c", go: "c", golang: "c", rust: "c", rs: "c", kotlin: "c", swift: "c", cs: "c", csharp: "c", sh: "shell",
  bash: "shell", zsh: "shell", console: "shell", yml: "yaml", toml: "yaml", ini: "yaml",
};
const ARTICLE_CODE_LABELS = {
  ts: "TypeScript", tsx: "TypeScript", typescript: "TypeScript", cpp: "C++", "c++": "C++", cc: "C++", hpp: "C++",
  cuda: "CUDA", cu: "CUDA", java: "Java", go: "Go", golang: "Go", rust: "Rust", rs: "Rust", kotlin: "Kotlin",
  swift: "Swift", cs: "C#", csharp: "C#", c: "C", h: "C", toml: "TOML", ini: "INI", zsh: "Zsh",
};
const articleCodePatterns = new Map();

function articleCodePattern(name) {
  if (!articleCodePatterns.has(name)) {
    const spec = ARTICLE_CODE_SPECS[name];
    const flags = spec.caseInsensitive ? "gim" : "gm";
    articleCodePatterns.set(name, {
      regex: new RegExp(
        [
          `(${spec.comment})`,
          `(${spec.string})`,
          `(${spec.number || String.raw`\b(?:0[xX][\da-fA-F]+|\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?)\b`})`,
          `(${spec.extra || "(?!)"})`,
          String.raw`([A-Za-z_$][\w$]*)`,
        ].join("|"),
        flags,
      ),
      keywords: new Set(spec.keywords.split(" ").filter(Boolean)),
      constants: new Set(spec.constants.split(" ").filter(Boolean).map((word) => (spec.caseInsensitive ? word.toLowerCase() : word))),
    });
  }
  return articleCodePatterns.get(name);
}

// 轻量着色的结果映射到 highlight.js 的类名，markdown-nice 的代码主题可以直接用。
const ARTICLE_CODE_HLJS_CLASSES = {
  comment: "hljs-comment",
  string: "hljs-string",
  number: "hljs-number",
  keyword: "hljs-keyword",
  constant: "hljs-literal",
  function: "hljs-title",
  property: "hljs-attr",
  decorator: "hljs-meta",
  attr: "hljs-variable",
};

// 轻量着色：只区分注释、字符串、数字、关键字、常量和函数名，够读代码用，不追求完整语法。
function highlightArticleCode(source, lang) {
  const name = ARTICLE_CODE_SPECS[lang] ? lang : ARTICLE_CODE_ALIASES[lang];
  if (!name) return escapeHtml(source);
  const spec = ARTICLE_CODE_SPECS[name];
  const { regex, keywords, constants } = articleCodePattern(name);
  let html = "";
  let last = 0;
  for (const match of source.matchAll(regex)) {
    const [text, comment, string, number, extra, word] = match;
    if (!text) continue;
    html += escapeHtml(source.slice(last, match.index));
    last = match.index + text.length;
    let kind = "";
    if (comment) kind = "comment";
    else if (string) kind = spec.keys && /^\s*:/.test(source.slice(last)) ? "property" : "string";
    else if (number) kind = "number";
    else if (extra) kind = spec.extraKind;
    else if (word) {
      const key = spec.caseInsensitive ? word.toLowerCase() : word;
      if (keywords.has(key)) kind = "keyword";
      else if (constants.has(key)) kind = "constant";
      else if (/^\s*\(/.test(source.slice(last, last + 8))) kind = "function";
    }
    html += kind ? `<span class="${ARTICLE_CODE_HLJS_CLASSES[kind]}">${escapeHtml(text)}</span>` : escapeHtml(text);
  }
  return html + escapeHtml(source.slice(last));
}

function renderArticleCodeBlock(source, lang, mac = true) {
  const name = ARTICLE_CODE_SPECS[lang] ? lang : ARTICLE_CODE_ALIASES[lang];
  const label = ARTICLE_CODE_LABELS[lang] || ARTICLE_CODE_SPECS[name]?.label || (["text", "txt", "plain", "plaintext"].includes(lang) ? "" : lang);
  const code = source.replace(/\t/g, "    ");
  // Mac 风格的头部用真实元素而不是 ::before，复制到公众号时才能带上内联样式；
  // 放在 code.hljs 里面，背景色跟着代码主题走。
  const head = mac
    ? `<span class="article-code-head"><span class="article-code-dots"><span>●</span><span>●</span><span>●</span></span>` +
      `${label ? `<span class="article-code-lang">${escapeHtml(label)}</span>` : ""}</span>`
    : "";
  return `<pre class="custom${mac ? " mac" : ""}"><code class="hljs">${head}${highlightArticleCode(code, lang)}</code></pre>`;
}

function renderArticleInline(text) {
  return renderArticleInlineTokens(parseInline(String(text || "")));
}

function renderArticleInlineTokens(tokens) {
  return tokens
    .map((token) => {
      let inner = escapeHtml(token.text).replace(/`([^`]+)`/g, "<code>$1</code>");
      if (token.bold) inner = `<strong>${inner}</strong>`;
      if (token.italic) inner = `<em>${inner}</em>`;
      if (token.link) {
        inner = `<a href="${escapeAttribute(token.link)}">${inner}</a>`;
      }

      const styles = [];
      if (token.size) {
        styles.push(`font-size: calc(var(--article-base-size, 17px) * ${token.size} / var(--card-font-size, ${DEFAULT_CARD_FONT_SIZE}))`);
      }
      if (token.color) styles.push(`color: ${token.color}`);
      if (token.underline) {
        styles.push("text-decoration-line: underline");
        styles.push(`text-decoration-style: ${token.underline}`);
        styles.push("text-decoration-thickness: 2px");
        styles.push("text-underline-offset: var(--article-underline-gap, 15px)");
      }
      if (token.bgColor) {
        styles.push(`background-color: ${token.bgColor}`);
        // 微信深色模式只反转没有显式颜色的文字，却照样保留内联背景色：
        // 浅色高亮块上的字会被反成浅色而看不见。这里按底色明暗写死文字色。
        if (!token.color) styles.push(`color: ${isDarkHexColor(token.bgColor) ? "#ffffff" : "#1f2329"}`);
        styles.push("border-radius: 4px");
        styles.push("box-decoration-break: clone");
        styles.push("-webkit-box-decoration-break: clone");
        styles.push("padding: 0 3px");
      }

      return styles.length ? `<span style="${escapeAttribute(styles.join("; "))}">${inner}</span>` : inner;
    })
    .join("");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function createLivePreviewVideo(image, imageId, className) {
  const media = liveMediaFiles.get(String(image.videoKey || imageId));
  const videoSource = media?.url || image.previewVideoSrc;
  if (!videoSource) return null;
  const settings = normalizeLiveMediaSettings(image.liveSettings);
  const video = document.createElement("video");
  video.className = className;
  video.src = videoSource;
  video.muted = true;
  video.loop = false;
  video.autoplay = true;
  video.playsInline = true;
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  if (settings.crop) {
    video.style.objectFit = "fill";
    video.style.width = `${100 / settings.crop.width}%`;
    video.style.height = `${100 / settings.crop.height}%`;
    video.style.left = `${(-settings.crop.x / settings.crop.width) * 100}%`;
    video.style.top = `${(-settings.crop.y / settings.crop.height) * 100}%`;
    video.style.right = "auto";
    video.style.bottom = "auto";
  } else {
    video.style.objectPosition = `${settings.focusX}% ${settings.focusY}%`;
  }
  video.addEventListener("loadedmetadata", () => {
    video.currentTime = Math.min(video.duration || settings.start, settings.start);
    video.playbackRate = settings.speed;
    video.play().catch(() => {});
  });
  video.addEventListener("timeupdate", () => {
    const span = settings.duration * settings.speed;
    if (video.currentTime >= settings.start + span) {
      video.currentTime = settings.start;
      video.play().catch(() => {});
    }
  });
  return video;
}

function hydrateArticleLiveMedia(article, images) {
  article.querySelectorAll("[data-live-image-id]").forEach((figure) => {
    const imageId = figure.dataset.liveImageId;
    const image = images[imageId];
    const stage = figure.querySelector(".article-live-stage");
    if (!image || !stage) return;
    const video = createLivePreviewVideo(image, imageId, "article-live-video");
    if (!video) return;
    const badge = document.createElement("span");
    badge.className = "article-live-badge";
    badge.innerHTML = '<i data-lucide="aperture"></i>LIVE';
    stage.append(video, badge, buildArticleLiveActions(imageId, stage.querySelector("img")));
  });
  article.querySelectorAll("figure:not([data-live-image-id])").forEach((figure) => {
    const image = figure.querySelector("img");
    if (!image) return;
    figure.classList.add("article-image-figure");
    const actions = document.createElement("div");
    actions.className = "article-live-actions";
    actions.append(buildArticleCopyImageButton(image));
    figure.append(actions);
  });
}

/** 长文预览里每段实况自带「编辑」入口，否则改这段实况只能先切回图文卡片。 */
function buildArticleLiveActions(imageId, image) {
  const actions = document.createElement("div");
  actions.className = "article-live-actions";

  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "article-live-action";
  edit.title = "编辑这段实况";
  edit.setAttribute("aria-label", "编辑这段实况");
  edit.innerHTML = '<i data-lucide="pencil"></i>';
  edit.addEventListener("click", (event) => {
    event.preventDefault();
    void openLivePhotoEditor(imageId);
  });

  if (image) actions.append(buildArticleCopyImageButton(image));
  actions.append(edit);
  return actions;
}

/**
 * 知乎粘贴富文本时丢掉 base64 图片，但能直接上传剪贴板里的图片，所以每张图单独给一个复制入口。
 * 按钮放在 .article-live-actions 里，复制公众号格式和导出长图时会被一并去掉。
 */
function buildArticleCopyImageButton(image) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "article-live-action";
  button.title = "复制图片";
  button.setAttribute("aria-label", "复制图片");
  button.innerHTML = '<i data-lucide="copy"></i>';
  button.addEventListener("click", (event) => {
    event.preventDefault();
    void copyArticleImage(image, button);
  });
  return button;
}

async function articleImagePngBlob(image) {
  const src = image.currentSrc || image.src;
  if (/^data:image\/png[;,]/i.test(src)) return (await fetch(src)).blob();
  // 剪贴板只稳定支持 PNG，JPG/WebP/GIF 先画到画布上转一次。
  if (!image.complete || !image.naturalWidth) await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  canvas.getContext("2d").drawImage(image, 0, 0);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("图片转换失败。"))), "image/png");
  });
}

async function copyArticleImage(image, button) {
  if (!navigator.clipboard?.write || !window.ClipboardItem) {
    els.status.textContent = "当前浏览器不支持复制图片，请右键图片选择“复制图片”。";
    return;
  }
  try {
    // 直接把 Promise 交给 ClipboardItem，Safari 才认这次点击的授权。
    await navigator.clipboard.write([new window.ClipboardItem({ "image/png": articleImagePngBlob(image) })]);
    els.status.textContent = "已复制图片，可粘贴到知乎等编辑器";
    button.innerHTML = '<i data-lucide="check"></i>';
    if (window.lucide) window.lucide.createIcons();
    window.setTimeout(() => {
      button.innerHTML = '<i data-lucide="copy"></i>';
      if (window.lucide) window.lucide.createIcons();
    }, 1500);
  } catch (error) {
    els.status.textContent = error?.message ? `复制图片失败：${error.message}` : "复制图片失败，请允许浏览器访问剪贴板。";
  }
}

const WECHAT_STYLE_PROPERTIES = [
  "background-color",
  "border",
  "border-bottom",
  "border-left",
  "border-radius",
  "border-right",
  "border-top",
  "border-collapse",
  "box-decoration-break",
  "color",
  "display",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "letter-spacing",
  "line-height",
  "list-style-position",
  "list-style-type",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "max-width",
  "overflow-wrap",
  "overflow-x",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "text-align",
  "text-decoration",
  "text-decoration-line",
  "text-decoration-style",
  "text-decoration-thickness",
  "text-underline-offset",
  "vertical-align",
  "white-space",
  "word-break",
];

// 这些属性多数元素上都是默认值，只在主题真的写了时才带上，免得每个元素多一串样式。
const WECHAT_OPTIONAL_PROPERTIES = {
  "background-image": "none",
  "background-position": "0% 0%",
  "background-repeat": "repeat",
  "background-size": "auto",
  "box-shadow": "none",
  opacity: "1",
  "text-indent": "0px",
  "text-shadow": "none",
};
// 宽高取主题里写的原值（如 64%）：计算样式只有像素，换到手机宽度会不对。
const WECHAT_DECLARED_PROPERTIES = ["width", "height", "min-width", "min-height"];
const WECHAT_VOID_TAGS = new Set(["IMG", "BR", "HR", "INPUT", "VIDEO"]);

/** 主题里写了宽高的规则，按选择器拆开，伪元素单独记下。 */
function wechatDeclaredRules() {
  const rules = [];
  const visit = (list) => Array.from(list || []).forEach((rule) => {
    if (!(rule instanceof CSSStyleRule)) return visit(rule.cssRules);
    const styles = WECHAT_DECLARED_PROPERTIES
      .map((property) => [property, rule.style.getPropertyValue(property)])
      .filter(([, value]) => value && !value.includes("var("));
    if (!styles.length) return;
    const selectors = splitSelectorList(rule.selectorText).map((selector) => {
      const pseudo = selector.match(/::?(before|after)$/i);
      return { base: pseudo ? selector.slice(0, pseudo.index) : selector, pseudo: pseudo?.[1].toLowerCase() || "" };
    });
    rules.push({ selectors, styles });
  });
  try {
    visit(els.articleThemeStyle.sheet?.cssRules);
  } catch {}
  return rules;
}

function declaredWechatStyles(rules, element, pseudo = "") {
  const styles = [];
  rules.forEach((rule) => {
    const matched = rule.selectors.some((selector) => {
      if (selector.pseudo !== pseudo) return false;
      try {
        return element.matches(selector.base || "*");
      } catch {
        return false;
      }
    });
    if (matched) rule.styles.forEach(([property, value]) => styles.push(`${property}:${value}`));
  });
  return styles;
}

function wechatInlineStyles(computed) {
  const styles = WECHAT_STYLE_PROPERTIES.map((property) => {
    const value = computed.getPropertyValue(property);
    return value ? `${property}:${value}` : "";
  }).filter(Boolean);
  const hasImage = computed.getPropertyValue("background-image") !== "none";
  Object.entries(WECHAT_OPTIONAL_PROPERTIES).forEach(([property, initial]) => {
    if (property.startsWith("background-") && property !== "background-image" && !hasImage) return;
    const value = computed.getPropertyValue(property);
    if (value && value !== initial) styles.push(`${property}:${value}`);
  });
  return styles;
}

function copyComputedWechatStyles(source, target, rules) {
  const styles = [...wechatInlineStyles(window.getComputedStyle(source)), ...declaredWechatStyles(rules, source)];
  if (source.tagName === "IMG") {
    styles.push("display:block", "max-width:100%", "height:auto");
    target.removeAttribute("width");
    target.removeAttribute("height");
  }
  target.setAttribute("style", styles.join(";"));
  target.removeAttribute("class");
  target.removeAttribute("id");
  for (const attribute of Array.from(target.attributes)) {
    if (attribute.name.startsWith("data-")) target.removeAttribute(attribute.name);
  }
}

// 公众号编辑器会吞掉 pre 里的空格和换行，导出前把缩进换成不换行空格、换行换成 <br>。
function preserveWechatCodeWhitespace(code) {
  const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  for (const node of textNodes) {
    const lines = node.nodeValue.replace(/ /g, "\u00a0").split("\n");
    const fragment = document.createDocumentFragment();
    lines.forEach((line, index) => {
      if (index) fragment.append(document.createElement("br"));
      if (line) fragment.append(document.createTextNode(line));
    });
    node.replaceWith(fragment);
  }
}

/** 伪元素的 content 只认字符串（含 "" 这种纯装饰的空内容）；counter()、attr() 之类返回 null，不复制。 */
function wechatPseudoText(content) {
  if (!content || !content.startsWith('"')) return null;
  const strings = [...content.matchAll(/"((?:\\.|[^"\\])*)"/g)].map(([, text]) =>
    text.replace(/\\([0-9a-fA-F]{1,6}\s?|[\s\S])/g, (_, escape) =>
      /^[0-9a-fA-F]/.test(escape) ? String.fromCodePoint(parseInt(escape, 16)) : escape),
  );
  return strings.join("");
}

/** 公众号不认 ::before / ::after，把它们换成带同样样式的 span（markdown-nice 用 juice 的 inlinePseudoElements 做同一件事）。 */
function wechatPseudoElement(source, pseudo, rules) {
  const computed = window.getComputedStyle(source, `::${pseudo}`);
  const text = wechatPseudoText(computed.content);
  if (text === null || computed.display === "none") return null;
  const span = document.createElement("span");
  span.textContent = text;
  span.setAttribute("style", [...wechatInlineStyles(computed), ...declaredWechatStyles(rules, source, pseudo)].join(";"));
  return span;
}

function serializeArticleForWechat() {
  let article = els.pages.querySelector(".article-preview");
  if (!article || state.appMode !== "article") {
    state.appMode = "article";
    updateAppMode();
    renderArticlePreview(readForm());
    article = els.pages.querySelector(".article-preview");
  }
  if (!article || !readForm().content.trim()) {
    throw new Error("长文内容为空，请先输入正文。");
  }

  const rules = wechatDeclaredRules();
  const clone = article.cloneNode(true);
  const sourceNodes = [article, ...article.querySelectorAll("*")];
  const cloneNodes = [clone, ...clone.querySelectorAll("*")];
  sourceNodes.forEach((source, index) => copyComputedWechatStyles(source, cloneNodes[index], rules));
  sourceNodes.forEach((source, index) => {
    const target = cloneNodes[index];
    // 主题隐藏的元素（如标题的 .prefix）公众号会照样显示，直接删掉。
    if (source.matches?.("video, .article-live-badge, .article-live-actions") || window.getComputedStyle(source).display === "none") {
      target.remove();
      return;
    }
    if (WECHAT_VOID_TAGS.has(source.tagName)) return;
    const before = wechatPseudoElement(source, "before", rules);
    const after = wechatPseudoElement(source, "after", rules);
    if (before) target.prepend(before);
    if (after) target.append(after);
  });
  clone.querySelectorAll("[data-live-image-id]").forEach((node) => node.removeAttribute("data-live-image-id"));
  clone.querySelectorAll("pre code").forEach(preserveWechatCodeWhitespace);

  const section = document.createElement("section");
  const articleStyle = window.getComputedStyle(article);
  section.setAttribute(
    "style",
    [
      "margin:0 auto",
      "padding:0",
      `color:${articleStyle.color}`,
      `background-color:${articleStyle.backgroundColor}`,
      `font-family:${articleStyle.fontFamily}`,
      `font-size:${articleStyle.fontSize}`,
      `line-height:${articleStyle.lineHeight}`,
      `letter-spacing:${articleStyle.letterSpacing}`,
      "max-width:100%",
      "overflow-wrap:break-word",
    ].join(";"),
  );
  while (clone.firstChild) section.append(clone.firstChild);
  return {
    html: section.outerHTML,
    text: article.innerText.trim(),
    article,
  };
}

async function writeRichClipboard(html, text) {
  if (navigator.clipboard?.write && window.ClipboardItem) {
    try {
      await navigator.clipboard.write([
        new window.ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ]);
      return;
    } catch {}
  }

  const holder = document.createElement("div");
  holder.contentEditable = "true";
  holder.style.position = "fixed";
  holder.style.left = "-10000px";
  holder.innerHTML = html;
  document.body.append(holder);
  const range = document.createRange();
  range.selectNodeContents(holder);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  const copied = document.execCommand("copy");
  selection.removeAllRanges();
  holder.remove();
  if (!copied) throw new Error("浏览器没有允许复制。");
}

async function copyArticleToWechat() {
  try {
    const serialized = serializeArticleForWechat();
    await writeRichClipboard(serialized.html, serialized.text);
    els.status.textContent = "已复制公众号富文本，可直接粘贴到公众号编辑器";
  } catch (error) {
    els.status.textContent = error?.message || "复制失败，请允许浏览器访问剪贴板。";
  }
}

const FEISHU_THEMED_TEXT = "h1, h2, h3, h4, h5, h6, strong, th";
let opaqueColorContext = null;

// 主题色里有 color-mix() 和半透明底色，飞书不认，先叠到白底上换成实色；全透明返回空串。
function opaqueCssColor(value) {
  opaqueColorContext ||= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const context = opaqueColorContext;
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = "#000";
  context.fillStyle = value;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
  if (!a) return "";
  const blend = (channel) => Math.round((channel * a + 255 * (255 - a)) / 255);
  return `rgb(${blend(r)}, ${blend(g)}, ${blend(b)})`;
}

// 飞书文档的文字色和底色只能从固定色板里选，色板外的颜色粘贴时直接丢掉（值取自飞书复制出的 HTML）。
const FEISHU_PALETTE = [
  { text: "rgb(216,57,49)", light: "rgb(251,191,188)", dark: "rgb(247,105,100)" },
  { text: "rgb(222,120,2)", light: "rgb(254,212,164)", dark: "rgb(255,165,61)" },
  { text: "rgb(220,155,4)", light: "rgba(255,246,122,0.8)", dark: "rgb(255,233,40)" },
  { text: "rgb(46,161,33)", light: "rgba(183,237,177,0.8)", dark: "rgb(98,210,86)" },
  { text: "rgb(36,91,219)", light: "rgba(186,206,253,0.7)", dark: "rgba(78,131,253,0.55)" },
  { text: "rgb(100,37,208)", light: "rgba(205,178,250,0.7)", dark: "rgba(147,90,246,0.55)" },
];
const FEISHU_GRAY = { text: "rgb(100,106,115)", light: "rgba(222,224,227,0.8)", dark: "rgb(187,191,196)" };

function rgbToHsl(rgb) {
  const [r, g, b] = (String(rgb).match(/\d+/g) || []).slice(0, 3).map((channel) => Number(channel) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const delta = max - min;
  if (!delta) return { h: 0, s: 0, l };
  const s = delta / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / delta + 6) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return { h: h * 60, s, l };
}

FEISHU_PALETTE.forEach((entry) => (entry.hue = rgbToHsl(entry.text).h));

/** 把任意颜色换成飞书色板里色相最近的一格；正文色（深而不艳）和白底返回空串，表示不写颜色。 */
function feishuPaletteColor(rgb, role) {
  if (!rgb) return "";
  const { h, s, l } = rgbToHsl(rgb);
  if (role === "text" && (l < 0.2 || l > 0.9 || (s < 0.35 && l < 0.35))) return "";
  if (role === "background" && l > 0.97) return "";
  const hueDistance = (entry) => Math.min(Math.abs(entry.hue - h), 360 - Math.abs(entry.hue - h));
  const entry = s < 0.2 ? FEISHU_GRAY : FEISHU_PALETTE.reduce((best, item) => (hueDistance(item) < hueDistance(best) ? item : best));
  if (role === "text") return entry.text;
  return l > 0.75 ? entry.light : entry.dark;
}

/**
 * 飞书文档按语义标签识别块（标题、列表、引用、代码块、表格、图片），
 * 内联样式只认颜色和背景色，字体、字号、间距一律丢掉。
 * 所以这里不复制整套计算样式，而是把长文 HTML 收拾成干净的语义结构，
 * 只把主题给标题、加粗、表头上的文字色和底色写成内联 span 带过去。
 */
function serializeArticleForFeishu() {
  const form = readForm();
  if (!form.content.trim()) throw new Error("长文内容为空，请先输入正文。");
  // 按当前主题离屏渲染一份，读主题算出来的颜色；不依赖预览区是否已刷新。
  applyArticleThemeStyle(form);
  const article = document.createElement("article");
  article.className = "article-preview";
  article.style.cssText = "position:fixed;left:-10000px;top:0";
  article.innerHTML = markdownToArticleHtml(form.content, form.images, form);
  document.body.append(article);
  const root = article.cloneNode(true);
  const themed = Array.from(root.querySelectorAll(FEISHU_THEMED_TEXT));
  article.querySelectorAll(FEISHU_THEMED_TEXT).forEach((source, index) => {
    const computed = window.getComputedStyle(source);
    // 先原样写下主题算出来的颜色，下面统一换成飞书色板；正文黑和白底会在那一步被去掉。
    const styles = [`color:${opaqueCssColor(computed.color)}`];
    const background = opaqueCssColor(computed.backgroundColor);
    if (background) styles.push(`background-color:${background}`);
    const span = document.createElement("span");
    span.setAttribute("style", styles.join(";"));
    const target = themed[index];
    // 加粗要写成 span > strong：颜色挂在最外层的行内元素上，飞书才认；标题和表头是块，只能包在里面。
    if (target.tagName === "STRONG") {
      target.replaceWith(span);
      span.append(target);
    } else {
      span.append(...target.childNodes);
      target.append(span);
    }
  });
  article.remove();

  // 标题里 markdown-nice 结构的装饰 span 和列表项外的 section 拆掉，只留语义标签。
  root.querySelectorAll(".prefix, .suffix, .article-code-head").forEach((node) => node.remove());
  root.querySelectorAll(".content, li > section").forEach((node) => node.replaceWith(...node.childNodes));

  // 代码块：高亮 span 摊平成纯文本，保留原始换行，飞书才会识别成代码块。
  root.querySelectorAll("pre").forEach((pre) => {
    const code = document.createElement("code");
    code.textContent = pre.querySelector("code")?.textContent || "";
    const clean = document.createElement("pre");
    clean.append(code);
    pre.replaceWith(clean);
  });

  // 内联样式只留颜色和背景色并换成飞书色板，下划线换成 <u>，字号等飞书不认的直接拆掉外层 span。
  root.querySelectorAll("span[style]").forEach((span) => {
    if (span.style.textDecorationLine.includes("underline")) {
      const underline = document.createElement("u");
      underline.append(...span.childNodes);
      span.append(underline);
    }
    const color = feishuPaletteColor(span.style.color && opaqueCssColor(span.style.color), "text");
    const background = feishuPaletteColor(span.style.backgroundColor && opaqueCssColor(span.style.backgroundColor), "background");
    const styles = [];
    if (color) styles.push(`color:${color}`);
    if (background) styles.push(`background-color:${background}`);
    if (styles.length) span.setAttribute("style", styles.join(";"));
    else span.replaceWith(...span.childNodes);
  });

  root.querySelectorAll("a").forEach((link) => link.removeAttribute("style"));
  root.querySelectorAll(".article-table-wrap").forEach((wrap) => wrap.replaceWith(...wrap.childNodes));
  root.querySelectorAll("figure").forEach((figure) => {
    const image = figure.querySelector("img");
    if (!image) {
      figure.remove();
      return;
    }
    const paragraph = document.createElement("p");
    paragraph.append(image);
    figure.replaceWith(paragraph);
  });
  root.querySelectorAll("[class]").forEach((node) => node.removeAttribute("class"));

  // Safari 写剪贴板时会把每个顶层块补上 color:rgb(0,0,0) 等整套样式，飞书据此把块里的文字色和底色清掉
  // （只有表格单元格例外）。包一层 div，补样式只落在这层容器上，段落、标题、列表本身保持干净。
  return { html: `<div>${root.innerHTML}</div>`, text: plainTextForCopy(form.content) };
}

async function copyArticleToFeishu() {
  try {
    const serialized = serializeArticleForFeishu();
    await writeRichClipboard(serialized.html, serialized.text);
    els.status.textContent = "已复制飞书格式，可直接粘贴到飞书文档";
  } catch (error) {
    els.status.textContent = error?.message || "复制失败，请允许浏览器访问剪贴板。";
  }
}

function wechatTitleFromContent() {
  const line = String(els.content.value || "")
    .split("\n")
    .map((value) => value.trim())
    .find((value) => value && !isMarkdownImageBlock(value));
  const cleaned = String(line || "未命名长文")
    .replace(/^#{1,6}\s+/, "")
    .replace(/\{\{(?:color|bg):#[0-9a-fA-F]{6}\|([^}]+)\}\}/g, "$1")
    .replace(/[*_`>]/g, "")
    .trim();
  return cleaned.slice(0, 64) || "未命名长文";
}

function isWechatDataImage(source) {
  return /^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(String(source || ""));
}

function setWechatCover(source = "", label = "") {
  wechatCoverData = isWechatDataImage(source) ? source : "";
  els.wechatCoverPreview.innerHTML = "";
  if (wechatCoverData) {
    const image = document.createElement("img");
    image.src = wechatCoverData;
    image.alt = "公众号封面预览";
    els.wechatCoverPreview.append(image);
    els.wechatCoverHint.textContent = label || "已选择封面，同步时会保留原图数据。";
  } else {
    els.wechatCoverPreview.innerHTML = '<i data-lucide="image"></i><span>请选择封面</span>';
    els.wechatCoverHint.textContent = "正文没有可用图片，请单独上传一张封面。";
  }
  updateWechatConfirmState();
  if (window.lucide) window.lucide.createIcons();
}

function setWechatServiceMessage(message, type = "") {
  els.wechatServiceStatus.classList.toggle("ready", type === "ready");
  els.wechatServiceStatus.classList.toggle("error", type === "error");
  els.wechatServiceStatus.textContent = message;
}

function updateWechatConfirmState() {
  const complete = wechatServiceReady && Boolean(els.wechatTitle.value.trim()) && Boolean(wechatCoverData) && !wechatSyncing;
  els.wechatConfirm.disabled = !complete;
}

async function checkWechatService() {
  wechatServiceReady = false;
  setWechatServiceMessage("正在检查本机公众号同步服务…");
  updateWechatConfirmState();
  if (!/^https?:$/.test(window.location.protocol)) {
    setWechatServiceMessage("请用 npm start 打开本地版，直接打开 HTML 无法访问安全同步服务。", "error");
    return;
  }
  try {
    const response = await fetch("/api/wechat/status", { cache: "no-store" });
    if (!response.ok) throw new Error("服务不可用");
    const status = await response.json();
    wechatServiceReady = Boolean(status.ready);
    if (wechatServiceReady) {
      setWechatServiceMessage("本机同步服务已就绪。App Secret 仅保存在系统钥匙串中。", "ready");
    } else {
      setWechatServiceMessage(status.error || "本机公众号配置不完整，请检查 AppID、钥匙串和同步服务。", "error");
    }
  } catch {
    setWechatServiceMessage("当前页面未连接本机同步服务，请在项目目录执行 npm start 后重试。", "error");
  }
  updateWechatConfirmState();
}

async function openWechatModal() {
  let serialized;
  try {
    serialized = serializeArticleForWechat();
  } catch (error) {
    els.status.textContent = error?.message || "长文内容无法同步。";
    return;
  }
  els.wechatTitle.value = wechatTitleFromContent();
  els.wechatAuthor.value = "";
  els.wechatCover.value = "";
  const firstImage = serialized.article.querySelector("img[src]");
  setWechatCover(firstImage?.getAttribute("src") || "", firstImage ? "已默认使用正文第一张图片。" : "");
  els.wechatModal.classList.remove("hidden");
  if (window.lucide) window.lucide.createIcons();
  await checkWechatService();
  els.wechatTitle.focus();
  els.wechatTitle.select();
}

function closeWechatModal() {
  if (wechatSyncing) return;
  els.wechatModal.classList.add("hidden");
}

async function handleWechatCover(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!/^image\/(?:png|jpeg|webp|gif)$/i.test(file.type)) {
    setWechatServiceMessage("封面请使用 PNG、JPG、WebP 或 GIF。", "error");
    event.target.value = "";
    return;
  }
  const source = await readFileAsDataURL(file);
  setWechatCover(source, `已选择 ${file.name}，保留原图数据。`);
}

async function syncArticleToWechatDraft() {
  if (wechatSyncing) return;
  let serialized;
  try {
    serialized = serializeArticleForWechat();
  } catch (error) {
    setWechatServiceMessage(error?.message || "长文内容无法同步。", "error");
    return;
  }
  if (!wechatServiceReady || !els.wechatTitle.value.trim() || !wechatCoverData) {
    setWechatServiceMessage("请确认本机服务、文章标题和封面都已准备好。", "error");
    return;
  }

  wechatSyncing = true;
  updateWechatConfirmState();
  setWechatServiceMessage("正在上传正文图片并创建公众号草稿，请不要关闭页面…");
  try {
    const response = await fetch("/api/wechat/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: els.wechatTitle.value.trim(),
        author: els.wechatAuthor.value.trim(),
        slug: state.currentProjectId || "write-then-publish",
        html: serialized.html,
        cover: wechatCoverData,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.error || "公众号草稿同步失败。");
    const statusLabel = {
      created: "已创建",
      updated: "已更新",
      recovered: "已恢复并更新",
      unchanged: "内容未变化",
    }[result.status] || "已同步";
    wechatSyncing = false;
    els.wechatModal.classList.add("hidden");
    els.status.textContent = `${statusLabel}公众号草稿：${result.title || els.wechatTitle.value.trim()}`;
  } catch (error) {
    wechatSyncing = false;
    setWechatServiceMessage(error?.message || "同步失败，未确认草稿写入。", "error");
    updateWechatConfirmState();
  }
}

/** 自由裁剪时选区的最小边长，按源视频像素算。 */
const LIVE_CROP_MIN_SIZE = 32;

function livePhotoDuration() {
  return LIVE_PHOTO_DURATIONS.includes(livePhotoState.duration) ? livePhotoState.duration : 5;
}

/** 倍速下成片时长不变，但要从原片里取用更长的一段。选区、起点都按这个算。 */
function livePhotoSourceSpan() {
  return livePhotoDuration() * livePhotoSpeed();
}

/** 这个「时长 × 倍速」要取用的原片长度，当前视频够不够。没选视频时不拦。 */
function livePhotoComboFits(duration, speed) {
  const total = livePhotoState.sourceDuration;
  if (!total) return true;
  return duration * speed <= total + 0.03;
}

function livePhotoComboMessage(duration, speed) {
  return `视频只有 ${formatLivePhotoDuration(livePhotoState.sourceDuration)}，${duration} 秒${speed === 1 ? "" : ` × ${speed}×`} 需要 ${(duration * speed).toFixed(1)} 秒素材。`;
}

function livePhotoSpeed() {
  return LIVE_PHOTO_SPEEDS.includes(livePhotoState.speed) ? livePhotoState.speed : 1;
}

function livePhotoAspectRatio() {
  if (livePhotoState.aspect === "free") return clamp(finiteNumber(livePhotoState.customAspect, 0.75), 0.4, 2.5);
  if (livePhotoState.aspect === "original") {
    if (livePhotoState.sourceWidth > 0 && livePhotoState.sourceHeight > 0) {
      return livePhotoState.sourceWidth / livePhotoState.sourceHeight;
    }
    return 0.75;
  }
  return clamp(finiteNumber(livePhotoState.aspect, 0.75), 0.4, 2.5);
}

function fitLivePhotoCropToAspect(ratio, preserveSize = false) {
  const source = livePhotoSourceBounds();
  if (!source.width || !source.height) return;
  const current = clampCropRect(livePhotoState.crop, source);
  if (preserveSize) {
    livePhotoState.crop = fitRectToAspect(current, source, ratio);
    return;
  }

  const centerX = current.x + current.width / 2;
  const centerY = current.y + current.height / 2;
  const largest = fitRectToAspect(fullCropRect(source), source, ratio);
  livePhotoState.crop = {
    x: clamp(centerX - largest.width / 2, 0, source.width - largest.width),
    y: clamp(centerY - largest.height / 2, 0, source.height - largest.height),
    width: largest.width,
    height: largest.height,
  };
}

function setLivePhotoAspect(value, options = {}) {
  const allowed = ["free", "original", "1", "1.333333", "1.777778", "0.75", "0.5625"];
  livePhotoState.aspect = allowed.includes(String(value)) ? String(value) : "original";
  els.livePhotoRatioButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.liveRatio === livePhotoState.aspect);
  });
  const customRatioVisible = livePhotoState.aspect === "free";
  els.livePhotoCustomRatioRow.hidden = false;
  els.livePhotoCustomRatioRow.classList.toggle("is-visible", customRatioVisible);
  els.livePhotoCustomRatioRow.setAttribute("aria-hidden", customRatioVisible ? "false" : "true");
  if (customRatioVisible && !options.applyCustomRatio) {
    // 切到「自由」不该把已经框好的选区重新拍成滑杆的比例，保留现状、让滑杆去对齐它。
    syncLivePhotoCustomAspect();
    drawLivePhotoCropper();
    return;
  }
  const ratio = livePhotoAspectRatio();
  els.livePhotoCustomRatioOutput.value = ratio.toFixed(2);
  fitLivePhotoCropToAspect(ratio, Boolean(options.preserveCropSize));
  drawLivePhotoCropper();
}

function livePhotoAspectLabel(image) {
  const settings = normalizeLiveMediaSettings(image?.liveSettings);
  const labels = {
    original: "原视频",
    "1": "1:1",
    "1.333333": "4:3",
    "1.777778": "16:9",
    "0.75": "3:4",
    "0.5625": "9:16",
  };
  if (settings.aspect === "free") return `自由 ${settings.customAspect.toFixed(2)}`;
  return labels[settings.aspect] || "原视频";
}

function formatLivePhotoDuration(value) {
  const seconds = Math.max(0, Number(value) || 0);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds - minutes * 60;
  return minutes ? `${minutes}:${remainder.toFixed(1).padStart(4, "0")}` : `${seconds.toFixed(1)} 秒`;
}

function formatLivePhotoFileSize(value) {
  const bytes = Math.max(0, Number(value) || 0);
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function setLivePhotoServiceMessage(message, type = "") {
  els.livePhotoServiceStatus.classList.toggle("ready", type === "ready");
  els.livePhotoServiceStatus.classList.toggle("error", type === "error");
  els.livePhotoServiceStatus.textContent = message;
}

function livePhotoSelectionIsValid() {
  if (!livePhotoState.file || !livePhotoState.sourceDuration) return false;
  const start = Number(els.livePhotoStart.value) || 0;
  return start >= 0 && start + livePhotoSourceSpan() <= livePhotoState.sourceDuration + 0.03;
}

function updateLivePhotoGenerateState() {
  els.livePhotoGenerate.disabled = !livePhotoSelectionIsValid() || livePhotoState.generating;
}

function updateLivePhotoPreview() {
  drawLivePhotoCropper();
  updateLivePhotoGenerateState();
}

function livePhotoSourceBounds() {
  return { width: livePhotoState.sourceWidth, height: livePhotoState.sourceHeight };
}

function livePhotoCropFromNormalized(crop) {
  const source = livePhotoSourceBounds();
  if (!source.width || !source.height || !crop) return null;
  return clampCropRect(
    {
      x: crop.x * source.width,
      y: crop.y * source.height,
      width: crop.width * source.width,
      height: crop.height * source.height,
    },
    source,
  );
}

function normalizedLivePhotoCrop() {
  const source = livePhotoSourceBounds();
  const crop = livePhotoState.crop;
  if (!source.width || !source.height || !crop) return null;
  return {
    x: clamp(crop.x / source.width, 0, 1),
    y: clamp(crop.y / source.height, 0, 1),
    width: clamp(crop.width / source.width, 0.01, 1),
    height: clamp(crop.height / source.height, 0.01, 1),
  };
}

function getLivePhotoCropDisplay() {
  const canvas = els.livePhotoCropCanvas;
  const source = livePhotoSourceBounds();
  const padding = 28;
  const scale = Math.min((canvas.width - padding * 2) / source.width, (canvas.height - padding * 2) / source.height);
  const width = source.width * scale;
  const height = source.height * scale;
  return {
    x: (canvas.width - width) / 2,
    y: (canvas.height - height) / 2,
    width,
    height,
    scale,
  };
}

function livePhotoSourceToCanvasRect(rect) {
  const display = livePhotoState.cropDisplay;
  return {
    x: display.x + rect.x * display.scale,
    y: display.y + rect.y * display.scale,
    width: rect.width * display.scale,
    height: rect.height * display.scale,
  };
}

function livePhotoCanvasPoint(event) {
  const canvas = els.livePhotoCropCanvas;
  const bounds = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
    y: ((event.clientY - bounds.top) / bounds.height) * canvas.height,
  };
}

function livePhotoSourcePoint(point) {
  const source = livePhotoSourceBounds();
  const display = livePhotoState.cropDisplay;
  return {
    x: clamp((point.x - display.x) / display.scale, 0, source.width),
    y: clamp((point.y - display.y) / display.scale, 0, source.height),
  };
}

function drawLivePhotoCropper() {
  if (!els.livePhotoCropCanvas || !livePhotoState.sourceWidth || !livePhotoState.sourceHeight || !livePhotoState.crop) return;
  const canvas = els.livePhotoCropCanvas;
  const context = canvas.getContext("2d");
  livePhotoState.cropDisplay = getLivePhotoCropDisplay();
  const display = livePhotoState.cropDisplay;
  const crop = livePhotoSourceToCanvasRect(livePhotoState.crop);
  canvas.dataset.cropX = livePhotoState.crop.x.toFixed(3);
  canvas.dataset.cropY = livePhotoState.crop.y.toFixed(3);
  canvas.dataset.cropWidth = livePhotoState.crop.width.toFixed(3);
  canvas.dataset.cropHeight = livePhotoState.crop.height.toFixed(3);

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#090d17";
  context.fillRect(0, 0, canvas.width, canvas.height);
  if (els.livePhotoVideo.readyState >= 2) {
    context.drawImage(els.livePhotoVideo, display.x, display.y, display.width, display.height);
  }
  context.fillStyle = "rgba(2, 6, 23, 0.62)";
  context.fillRect(display.x, display.y, display.width, Math.max(0, crop.y - display.y));
  context.fillRect(display.x, crop.y + crop.height, display.width, Math.max(0, display.y + display.height - crop.y - crop.height));
  context.fillRect(display.x, crop.y, Math.max(0, crop.x - display.x), crop.height);
  context.fillRect(crop.x + crop.width, crop.y, Math.max(0, display.x + display.width - crop.x - crop.width), crop.height);

  context.strokeStyle = "#fff";
  context.lineWidth = 3;
  context.strokeRect(crop.x, crop.y, crop.width, crop.height);
  context.strokeStyle = "rgba(255, 255, 255, 0.74)";
  context.lineWidth = 1;
  for (let i = 1; i < 3; i += 1) {
    context.beginPath();
    context.moveTo(crop.x + (crop.width * i) / 3, crop.y);
    context.lineTo(crop.x + (crop.width * i) / 3, crop.y + crop.height);
    context.moveTo(crop.x, crop.y + (crop.height * i) / 3);
    context.lineTo(crop.x + crop.width, crop.y + (crop.height * i) / 3);
    context.stroke();
  }
  // 自由模式下四条边也能拖，得把边手柄画出来，不然用户不知道存在。
  if (livePhotoState.aspect === "free") {
    const bar = Math.min(26, crop.width / 3, crop.height / 3);
    context.fillStyle = "rgba(255, 255, 255, 0.92)";
    [
      [crop.x + crop.width / 2 - bar / 2, crop.y - 2, bar, 4],
      [crop.x + crop.width / 2 - bar / 2, crop.y + crop.height - 2, bar, 4],
      [crop.x - 2, crop.y + crop.height / 2 - bar / 2, 4, bar],
      [crop.x + crop.width - 2, crop.y + crop.height / 2 - bar / 2, 4, bar],
    ].forEach(([x, y, w, h]) => context.fillRect(x, y, w, h));
  }

  context.fillStyle = "#fff";
  [[crop.x, crop.y], [crop.x + crop.width, crop.y], [crop.x, crop.y + crop.height], [crop.x + crop.width, crop.y + crop.height]].forEach(([x, y]) => {
    context.beginPath();
    context.arc(x, y, 9, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(23, 32, 47, 0.62)";
    context.lineWidth = 2;
    context.stroke();
  });
}

function animateLivePhotoCropper() {
  drawLivePhotoCropper();
  if (!els.livePhotoVideo.paused && !els.livePhotoVideo.ended) {
    livePhotoState.previewFrame = requestAnimationFrame(animateLivePhotoCropper);
  } else {
    livePhotoState.previewFrame = 0;
  }
}

/** 自由模式下的裁剪：四角 + 四边都能拖，且不锁宽高比。
    锁比例时仍走 resizeCropRect —— 那条路径要维持比例，只认四角。 */
function resizeLiveCropRect(handle, startRect, point, source, aspect) {
  if (aspect) return resizeCropRect(handle, startRect, point, source, aspect);
  const min = LIVE_CROP_MIN_SIZE;
  let left = startRect.x;
  let top = startRect.y;
  let right = startRect.x + startRect.width;
  let bottom = startRect.y + startRect.height;
  if (handle.includes("w")) left = clamp(point.x, 0, right - min);
  if (handle.includes("e")) right = clamp(point.x, left + min, source.width);
  if (handle.includes("n")) top = clamp(point.y, 0, bottom - min);
  if (handle.includes("s")) bottom = clamp(point.y, top + min, source.height);
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function detectLivePhotoCropHit(point) {
  const crop = livePhotoSourceToCanvasRect(livePhotoState.crop);
  // 手柄画出来才 r=11，之前却按 48 判定命中：裁剪框一小，四个角的判定区就连成一片，
  // 「移动」永远点不到，看起来就像框选失灵。所以既压半径，也按框自身尺寸再收一次。
  const reach = Math.max(10, Math.min(22, crop.width / 3, crop.height / 3));
  const spanX = point.x >= crop.x - reach && point.x <= crop.x + crop.width + reach;
  const spanY = point.y >= crop.y - reach && point.y <= crop.y + crop.height + reach;

  let handle = "";
  if (spanX && Math.abs(point.y - crop.y) <= reach) handle += "n";
  else if (spanX && Math.abs(point.y - (crop.y + crop.height)) <= reach) handle += "s";
  if (spanY && Math.abs(point.x - crop.x) <= reach) handle += "w";
  else if (spanY && Math.abs(point.x - (crop.x + crop.width)) <= reach) handle += "e";

  if (handle) {
    if (handle.length === 2 || livePhotoState.aspect === "free") return handle;
    // 锁比例时边手柄没法同时定住宽和高，把它补成离指针最近的那个角。
    const cornerX = point.x < crop.x + crop.width / 2 ? "w" : "e";
    const cornerY = point.y < crop.y + crop.height / 2 ? "n" : "s";
    return handle === "n" || handle === "s" ? handle + cornerX : cornerY + handle;
  }
  if (point.x >= crop.x && point.x <= crop.x + crop.width && point.y >= crop.y && point.y <= crop.y + crop.height) return "move";
  return "move-new";
}

const LIVE_CROP_CURSORS = {
  nw: "nwse-resize", se: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize",
  n: "ns-resize", s: "ns-resize", w: "ew-resize", e: "ew-resize",
  move: "grab", "move-new": "crosshair",
};

/** 不拖的时候也要让指针形状说明哪里能抓，否则手柄等于隐藏的。 */
function updateLivePhotoCropCursor(event) {
  if (livePhotoState.cropDrag || !livePhotoState.crop || !livePhotoState.sourceWidth) return;
  livePhotoState.cropDisplay = getLivePhotoCropDisplay();
  const hit = detectLivePhotoCropHit(livePhotoCanvasPoint(event));
  els.livePhotoCropCanvas.style.cursor = LIVE_CROP_CURSORS[hit] || "default";
}

function startLivePhotoCropDrag(event) {
  if (!livePhotoState.crop || !livePhotoState.sourceWidth) return;
  livePhotoState.cropDisplay = getLivePhotoCropDisplay();
  const canvasPoint = livePhotoCanvasPoint(event);
  const display = livePhotoState.cropDisplay;
  // 留一点余量：选区贴着画面边缘时，手柄的判定区有一半在画面外，卡死就抓不住了。
  const slack = 24;
  if (canvasPoint.x < display.x - slack || canvasPoint.x > display.x + display.width + slack
    || canvasPoint.y < display.y - slack || canvasPoint.y > display.y + display.height + slack) return;
  event.preventDefault();
  const sourcePoint = livePhotoSourcePoint(canvasPoint);
  const source = livePhotoSourceBounds();
  let action = detectLivePhotoCropHit(canvasPoint);
  if (action === "move-new") {
    livePhotoState.crop = clampMovedRect({
      ...livePhotoState.crop,
      x: sourcePoint.x - livePhotoState.crop.width / 2,
      y: sourcePoint.y - livePhotoState.crop.height / 2,
    }, source);
    action = "move";
  }
  livePhotoState.cropDrag = {
    action,
    startX: sourcePoint.x,
    startY: sourcePoint.y,
    startRect: { ...livePhotoState.crop },
    pointerId: event.pointerId,
  };
  els.livePhotoCropCanvas.setPointerCapture?.(event.pointerId);
  drawLivePhotoCropper();
}

function moveLivePhotoCropDrag(event) {
  if (!livePhotoState.cropDrag) return;
  event.preventDefault();
  const point = livePhotoSourcePoint(livePhotoCanvasPoint(event));
  const drag = livePhotoState.cropDrag;
  const source = livePhotoSourceBounds();
  if (drag.action === "move") {
    livePhotoState.crop = clampMovedRect({
      ...drag.startRect,
      x: drag.startRect.x + point.x - drag.startX,
      y: drag.startRect.y + point.y - drag.startY,
    }, source);
  } else {
    // 「自由」就要真的自由：这里以前照样传比例进去，于是四角拖动仍被滑杆锁死，
    // 自由模式实际只是「换一个固定比例」，用户根本框不出想要的形状。
    const locked = livePhotoState.aspect === "free" ? 0 : livePhotoAspectRatio();
    livePhotoState.crop = resizeLiveCropRect(drag.action, drag.startRect, point, source, locked);
    if (!locked) syncLivePhotoCustomAspect();
  }
  drawLivePhotoCropper();
}

/** 自由拖完之后，把滑杆和读数对回框的实际比例，两边才不会互相打架。 */
function syncLivePhotoCustomAspect() {
  const crop = livePhotoState.crop;
  if (!crop || !crop.height) return;
  livePhotoState.customAspect = clamp(crop.width / crop.height, 0.4, 2.5);
  els.livePhotoCustomRatio.value = String(livePhotoState.customAspect);
  els.livePhotoCustomRatioOutput.value = livePhotoState.customAspect.toFixed(2);
}

function stopLivePhotoCropDrag(event) {
  if (!livePhotoState.cropDrag) return;
  els.livePhotoCropCanvas.releasePointerCapture?.(livePhotoState.cropDrag.pointerId);
  livePhotoState.cropDrag = null;
  drawLivePhotoCropper();
}

function seekLivePhotoPreview(toCover = false) {
  if (!livePhotoState.sourceDuration) return;
  const start = Math.max(0, Number(els.livePhotoStart.value) || 0);
  const offset = toCover ? Math.max(0, Number(els.livePhotoCover.value) || 0) : 0;
  els.livePhotoVideo.currentTime = Math.min(livePhotoState.sourceDuration, start + offset);
}

/**
 * 视频比要取用的时长长时，让用户在缩略图时间轴上直接拖方框选片段。
 * 刚好等于或短于目标时长就没得选，整条时间轴收起来。
 */
function updateLivePhotoTrimUi(start, target, availableStart) {
  if (!els.livePhotoTrimRow) return;
  const trimmable = livePhotoState.sourceDuration > target + 0.05;
  els.livePhotoTrimRow.hidden = !trimmable;
  if (!trimmable) return;
  const total = livePhotoState.sourceDuration;
  const end = Math.min(total, start + target);
  const speed = livePhotoSpeed();
  if (els.livePhotoTrimOutput) {
    els.livePhotoTrimOutput.textContent = speed === 1
      ? `第 ${start.toFixed(1)} – ${end.toFixed(1)} 秒`
      : `第 ${start.toFixed(1)} – ${end.toFixed(1)} 秒 → 成片 ${livePhotoDuration()} 秒`;
  }
  if (els.livePhotoTrimHint) {
    els.livePhotoTrimHint.textContent = speed === 1
      ? `视频共 ${formatLivePhotoDuration(total)}，方框就是会被做成实况的那一段`
      : `视频共 ${formatLivePhotoDuration(total)}；${speed}× 要取用 ${target.toFixed(1)} 秒原片，压进 ${livePhotoDuration()} 秒实况`;
  }
  if (els.livePhotoTrimWindow) {
    els.livePhotoTrimWindow.style.width = `${(target / total) * 100}%`;
    els.livePhotoTrimWindow.style.left = `${(start / total) * 100}%`;
  }
  if (els.livePhotoTrimTrack) {
    els.livePhotoTrimTrack.setAttribute("aria-valuemin", "0");
    els.livePhotoTrimTrack.setAttribute("aria-valuemax", availableStart.toFixed(1));
    els.livePhotoTrimTrack.setAttribute("aria-valuenow", start.toFixed(1));
    els.livePhotoTrimTrack.setAttribute("aria-valuetext", `第 ${start.toFixed(1)} 到 ${end.toFixed(1)} 秒`);
  }
}

/** 沿时间轴均匀抽几帧铺成缩略图条，让人一眼看出每一段是什么画面。 */
async function buildLivePhotoTrimStrip() {
  const strip = els.livePhotoTrimStrip;
  if (!strip || !livePhotoState.objectUrl || !livePhotoState.sourceDuration) return;
  const token = `${livePhotoState.objectUrl}:${livePhotoState.sourceDuration}`;
  if (strip.dataset.token === token) return;
  strip.dataset.token = token;
  strip.innerHTML = "";

  const total = livePhotoState.sourceDuration;
  const count = 8;
  const width = 96;
  const height = Math.round(width * (livePhotoState.sourceHeight || 16) / (livePhotoState.sourceWidth || 9));
  const probe = document.createElement("video");
  probe.src = livePhotoState.objectUrl;
  probe.muted = true;
  probe.playsInline = true;
  probe.preload = "auto";
  probe.style.cssText = "position:fixed;left:-9999px;width:2px;height:2px";
  document.body.appendChild(probe);
  try {
    await Promise.race([
      new Promise((resolve) => { probe.onloadeddata = resolve; }),
      new Promise((_, reject) => window.setTimeout(() => reject(new Error("timeout")), 6000)),
    ]);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = Math.max(1, height);
    const context = canvas.getContext("2d");
    for (let index = 0; index < count; index += 1) {
      if (strip.dataset.token !== token) return;   // 期间换了视频就放弃这一轮
      const at = (total * (index + 0.5)) / count;
      await new Promise((resolve) => {
        let settled = false;
        probe.onseeked = () => { if (!settled) { settled = true; resolve(); } };
        probe.currentTime = Math.min(at, Math.max(0, total - 0.05));
        window.setTimeout(() => { if (!settled) { settled = true; resolve(); } }, 900);
      });
      context.drawImage(probe, 0, 0, canvas.width, canvas.height);
      const cell = document.createElement("span");
      cell.className = "live-photo-trim-cell";
      cell.style.backgroundImage = `url(${canvas.toDataURL("image/jpeg", 0.6)})`;
      strip.append(cell);
    }
  } catch {
    strip.dataset.token = "";   // 抽帧失败就留空条，不影响拖动
  } finally {
    probe.removeAttribute("src");
    probe.remove();
  }
}

/** 在时间轴上按下/拖动都直接定位片段起点，方框跟着走，预览同步跳过去。 */
function bindLivePhotoTrimTrack() {
  const track = els.livePhotoTrimTrack;
  if (!track) return;
  let dragging = false;

  const applyFromPointer = (clientX) => {
    const target = livePhotoSourceSpan();
    const total = livePhotoState.sourceDuration;
    if (!total || total <= target) return;
    const rect = track.getBoundingClientRect();
    if (!rect.width) return;
    const windowRatio = target / total;
    // 以指针为方框中心，再夹进 [0, 可选最大起点]
    const ratio = clamp((clientX - rect.left) / rect.width - windowRatio / 2, 0, 1 - windowRatio);
    els.livePhotoStart.value = String(Number((ratio * total).toFixed(1)));
    normalizeLivePhotoTiming();
    seekLivePhotoPreview(false);
  };

  track.addEventListener("pointerdown", (event) => {
    dragging = true;
    track.setPointerCapture?.(event.pointerId);
    track.classList.add("is-dragging");
    applyFromPointer(event.clientX);
    event.preventDefault();
  });
  track.addEventListener("pointermove", (event) => {
    if (dragging) applyFromPointer(event.clientX);
  });
  const stop = (event) => {
    if (!dragging) return;
    dragging = false;
    track.releasePointerCapture?.(event.pointerId);
    track.classList.remove("is-dragging");
  };
  track.addEventListener("pointerup", stop);
  track.addEventListener("pointercancel", stop);

  track.addEventListener("keydown", (event) => {
    const step = event.shiftKey ? 1 : 0.1;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const current = Math.max(0, Number(els.livePhotoStart.value) || 0);
    const available = Math.max(0, livePhotoState.sourceDuration - livePhotoSourceSpan());
    const next = clamp(current + (event.key === "ArrowRight" ? step : -step), 0, available);
    els.livePhotoStart.value = String(Number(next.toFixed(1)));
    normalizeLivePhotoTiming();
    seekLivePhotoPreview(false);
    event.preventDefault();
  });
}

function normalizeLivePhotoTiming() {
  const target = livePhotoSourceSpan();
  const availableStart = Math.max(0, livePhotoState.sourceDuration - target);
  const currentStart = Math.max(0, Number(els.livePhotoStart.value) || 0);
  const normalizedStart = Math.min(currentStart, availableStart);
  els.livePhotoStart.max = String(Math.max(0, availableStart).toFixed(1));
  els.livePhotoStart.value = String(Number(normalizedStart.toFixed(1)));
  const latestCover = Math.max(0, livePhotoDuration() - 0.05);
  els.livePhotoCover.max = String(latestCover);
  const cover = Math.min(latestCover, Math.max(0, finiteNumber(els.livePhotoCover.value, 0.2)));
  els.livePhotoCover.value = String(Number(cover.toFixed(1)));
  updateLivePhotoTrimUi(normalizedStart, target, availableStart);
  if (livePhotoState.file && livePhotoState.sourceDuration < target) {
    const speed = livePhotoSpeed();
    setLivePhotoServiceMessage(
      speed === 1
        ? `当前视频只有 ${formatLivePhotoDuration(livePhotoState.sourceDuration)}，不足以生成 ${livePhotoDuration()} 秒版本。`
        : `${speed}× 倍速的 ${livePhotoDuration()} 秒实况需要 ${target.toFixed(1)} 秒素材，当前视频只有 ${formatLivePhotoDuration(livePhotoState.sourceDuration)}。`,
      "error",
    );
  } else if (livePhotoState.file) {
    // 浏览器能自己合成时就别再说「上传到云端 Mac」——那条路径已经不会走了。
    setLivePhotoServiceMessage(
      livePhotoBrowserRenderSupported()
        ? "设置会跟随视频插入图文；右侧下载时在本机浏览器里合成，原视频不会上传。"
        : needsLivePhotoStaticFallback()
          ? "设置会跟随视频插入图文；当前站点尚未连接云端实况服务。"
          : cloudLivePhotoAvailable() && !isLocalHostSite()
            ? "设置会跟随视频插入图文；右侧下载时会安全上传原视频并由云端 Mac 生成实况。"
            : "设置会跟随视频插入图文；右侧下载时自动生成 Live Photo 发布包。",
      "ready",
    );
  }
  updateLivePhotoGenerateState();
}

function setLivePhotoDuration(value) {
  const duration = LIVE_PHOTO_DURATIONS.includes(Number(value)) ? Number(value) : 5;
  if (!livePhotoComboFits(duration, livePhotoSpeed())) {
    setLivePhotoServiceMessage(livePhotoComboMessage(duration, livePhotoSpeed()), "error");
    return;
  }
  livePhotoState.duration = duration;
  syncLivePhotoTimingUi();
}

function setLivePhotoSpeed(value) {
  const speed = LIVE_PHOTO_SPEEDS.includes(Number(value)) ? Number(value) : 1;
  if (!livePhotoComboFits(livePhotoDuration(), speed)) {
    setLivePhotoServiceMessage(livePhotoComboMessage(livePhotoDuration(), speed), "error");
    return;
  }
  livePhotoState.speed = speed;
  syncLivePhotoTimingUi();
}

function syncLivePhotoTimingUi() {
  const duration = livePhotoDuration();
  const speed = livePhotoSpeed();
  els.livePhotoDurationButtons.forEach((button) => {
    const value = Number(button.dataset.liveDuration);
    const fits = livePhotoComboFits(value, speed);
    button.classList.toggle("active", value === duration);
    button.classList.toggle("is-unavailable", !fits);
    button.setAttribute("aria-disabled", fits ? "false" : "true");
    button.title = fits ? "" : livePhotoComboMessage(value, speed);
  });
  els.livePhotoSpeedButtons.forEach((button) => {
    const value = Number(button.dataset.liveSpeed);
    const fits = livePhotoComboFits(duration, value);
    button.classList.toggle("active", value === speed);
    button.classList.toggle("is-unavailable", !fits);
    button.setAttribute("aria-disabled", fits ? "false" : "true");
    button.title = fits ? "" : livePhotoComboMessage(duration, value);
  });
  els.livePhotoDurationHint.textContent = `成片固定 ${duration} 秒`;
  if (els.livePhotoSpeedHint) {
    els.livePhotoSpeedHint.textContent = speed === 1
      ? "原速播放"
      : `取用原片 ${(duration * speed).toFixed(1)} 秒，压进 ${duration} 秒（无声）`;
  }
  els.livePhotoCover.max = String(Math.max(0, duration - 0.05));
  // 预览直接按倍速播，看到的就是成片的节奏。
  els.livePhotoVideo.playbackRate = speed;
  // 倍速下音频要重采样才能对上，成片一律静音，这里同步把开关置灰。
  if (els.livePhotoSound) els.livePhotoSound.disabled = speed !== 1;
  normalizeLivePhotoTiming();
  seekLivePhotoPreview(true);
}

function releaseLivePhotoObjectUrl() {
  if (!livePhotoState.objectUrl) return;
  URL.revokeObjectURL(livePhotoState.objectUrl);
  livePhotoState.objectUrl = "";
}

function handleLivePhotoVideo(event) {
  const file = event.target.files?.[0] || null;
  if (!file) return;
  // 浏览器本地合成只解所选的几秒，46 分钟 / 416MB 实测 0.1 秒就能取到片段，
  // 所以只有真要上传到云端时才需要卡体积；本地路径放宽到内存扛得住的范围。
  const canRenderLocally = Boolean(window.WriteThenPublishBrowserLivePhoto?.supported());
  const sizeLimit = canRenderLocally ? 1024 * 1024 * 1024 : 350 * 1024 * 1024;
  if (file.size > sizeLimit) {
    setLivePhotoServiceMessage(
      canRenderLocally
        ? "视频超过 1GB，浏览器可能撑不住，请先裁短后再试。"
        : "视频超过 350MB，请先裁短或压缩后再试。",
      "error",
    );
    event.target.value = "";
    return;
  }
  if (!/^video\/(?:mp4|quicktime|webm)$/i.test(file.type) && !/\.(?:mp4|mov|webm)$/i.test(file.name)) {
    setLivePhotoServiceMessage("请选择 MP4、MOV 或 WebM 视频。", "error");
    event.target.value = "";
    return;
  }
  releaseLivePhotoObjectUrl();
  if (event.target === els.contentVideo) {
    livePhotoState.editingId = "";
    els.livePhotoGenerate.innerHTML = '<i data-lucide="image-plus"></i>插入图文';
    resetLivePhotoForm();
  }
  livePhotoState.file = file;
  livePhotoState.sourceDuration = 0;
  livePhotoState.sourceWidth = 0;
  livePhotoState.sourceHeight = 0;
  livePhotoState.objectUrl = URL.createObjectURL(file);
  els.livePhotoVideo.src = livePhotoState.objectUrl;
  els.livePhotoPreview.classList.add("has-video");
  els.livePhotoFileLabel.textContent = file.name;
  if (els.livePhotoFileSwap) els.livePhotoFileSwap.hidden = false;
  els.livePhotoVideoMeta.textContent = `${formatLivePhotoFileSize(file.size)} · 正在读取视频…`;
  updateLivePhotoGenerateState();
  els.livePhotoModal.classList.remove("hidden");
  if (window.lucide) window.lucide.createIcons();
  els.livePhotoVideo.load();
}

function handleLivePhotoMetadata() {
  const duration = Number(els.livePhotoVideo.duration) || 0;
  if (!Number.isFinite(duration) || duration <= 0) {
    setLivePhotoServiceMessage("浏览器无法读取这个视频，请转换为 MP4 或 MOV 后再试。", "error");
    return;
  }
  livePhotoState.sourceDuration = duration;
  livePhotoState.sourceWidth = Number(els.livePhotoVideo.videoWidth) || 0;
  livePhotoState.sourceHeight = Number(els.livePhotoVideo.videoHeight) || 0;
  const source = livePhotoSourceBounds();
  livePhotoState.crop = livePhotoCropFromNormalized(livePhotoState.savedCrop) || fullCropRect(source);
  els.livePhotoVideoMeta.textContent = `${formatLivePhotoFileSize(livePhotoState.file?.size)} · ${formatLivePhotoDuration(duration)}`;
  normalizeLivePhotoTiming();
  setLivePhotoAspect(livePhotoState.aspect, { preserveCropSize: Boolean(livePhotoState.savedCrop) });
  seekLivePhotoPreview(false);
  els.livePhotoVideo.playbackRate = livePhotoSpeed();
  applyLivePhotoPreviewSound();
  void buildLivePhotoTrimStrip();
  els.livePhotoVideo.play().catch(() => {
    // 带声音起播被拦时退回静音，至少画面要动起来。
    els.livePhotoVideo.muted = true;
    els.livePhotoVideo.play().catch(() => drawLivePhotoCropper());
  });
}

/**
 * 编辑器里的预览跟着「保留原视频声音」走，让人当场听得到。
 * 卡片列表里的预览是自动播放的，浏览器不允许带声音自动播放，所以那些保持静音。
 */
function applyLivePhotoPreviewSound() {
  if (!els.livePhotoVideo) return;
  const wantSound = els.livePhotoSound ? els.livePhotoSound.checked : true;
  els.livePhotoVideo.muted = !wantSound;
  if (wantSound) {
    els.livePhotoVideo.removeAttribute("muted");
    els.livePhotoVideo.volume = 1;
  } else {
    els.livePhotoVideo.setAttribute("muted", "");
  }
  // 取消静音后浏览器可能已经把播放挂起，重新推一把；失败就退回静音继续放画面。
  if (wantSound && els.livePhotoVideo.paused && livePhotoState.sourceDuration) {
    els.livePhotoVideo.play().catch(() => {
      els.livePhotoVideo.muted = true;
      els.livePhotoVideo.play().catch(() => {});
    });
  }
}

function keepLivePhotoPreviewInRange() {
  if (!livePhotoState.sourceDuration || els.livePhotoVideo.paused) return;
  const start = Math.max(0, Number(els.livePhotoStart.value) || 0);
  if (els.livePhotoVideo.currentTime >= start + livePhotoSourceSpan()) {
    els.livePhotoVideo.currentTime = start;
    els.livePhotoVideo.play().catch(() => {});
  }
  drawLivePhotoCropper();
}

async function ensureLivePhotoServiceReady() {
  livePhotoState.localReady = false;
  livePhotoState.serviceMode = "none";
  if (!/^(?:https?:|file:)$/.test(window.location.protocol)) return false;
  try {
    const response = await fetch(livePhotoApiUrl("/api/live-photo/status"), { cache: "no-store" });
    if (response.ok) {
      const status = await response.json();
      livePhotoState.localReady = Boolean(status.ready);
      if (livePhotoState.localReady) {
        livePhotoState.serviceMode = "local";
        return true;
      }
    }
  } catch {
    livePhotoState.localReady = false;
  }
  if (cloudLivePhotoAvailable()) {
    livePhotoState.serviceMode = "cloud";
    return true;
  }
  return false;
}

function resetLivePhotoForm(settings = {}) {
  const normalized = normalizeLiveMediaSettings(settings);
  livePhotoState.savedCrop = normalized.crop;
  livePhotoState.crop = livePhotoCropFromNormalized(normalized.crop);
  livePhotoState.customAspect = normalized.customAspect;
  els.livePhotoCustomRatio.value = String(normalized.customAspect);
  els.livePhotoCustomRatioOutput.value = normalized.customAspect.toFixed(2);
  livePhotoState.duration = normalized.duration;
  livePhotoState.speed = normalized.speed;
  syncLivePhotoTimingUi();
  setLivePhotoAspect(normalized.aspect, { preserveCropSize: Boolean(normalized.crop) });
  els.livePhotoStart.value = String(normalized.start);
  els.livePhotoCover.value = String(normalized.coverOffset);
  if (els.livePhotoSound) els.livePhotoSound.checked = normalized.sound;
  applyLivePhotoPreviewSound();
  updateLivePhotoPreview();
}

async function openLivePhotoEditor(imageId) {
  const image = state.images[imageId];
  if (!image || image.kind !== "live") return;
  await hydrateLiveMediaForState();
  const media = liveMediaFiles.get(String(image.videoKey || imageId));
  if (!media?.blob) {
    els.status.textContent = "这张实况的原视频已经丢失，请重新上传视频。";
    return;
  }
  releaseLivePhotoObjectUrl();
  livePhotoState.editingId = imageId;
  livePhotoState.file = media.blob;
  livePhotoState.sourceDuration = Number(image.videoDuration) || 0;
  livePhotoState.sourceWidth = Number(image.videoWidth) || 0;
  livePhotoState.sourceHeight = Number(image.videoHeight) || 0;
  livePhotoState.objectUrl = URL.createObjectURL(media.blob);
  els.livePhotoFileLabel.textContent = image.videoName || media.name || "视频素材";
  if (els.livePhotoFileSwap) els.livePhotoFileSwap.hidden = false;
  els.livePhotoVideoMeta.textContent = `${formatLivePhotoFileSize(media.blob.size)} · ${formatLivePhotoDuration(livePhotoState.sourceDuration)}`;
  els.livePhotoVideo.src = livePhotoState.objectUrl;
  els.livePhotoPreview.classList.add("has-video");
  els.livePhotoGenerate.innerHTML = '<i data-lucide="check"></i>保存修改';
  resetLivePhotoForm(image.liveSettings);
  els.livePhotoModal.classList.remove("hidden");
  els.livePhotoVideo.load();
  if (window.lucide) window.lucide.createIcons();
}

function closeLivePhotoModal() {
  if (livePhotoState.generating) return;
  els.livePhotoVideo.pause();
  els.livePhotoModal.classList.add("hidden");
  releaseLivePhotoObjectUrl();
  livePhotoState.file = null;
  livePhotoState.sourceDuration = 0;
  livePhotoState.sourceWidth = 0;
  livePhotoState.sourceHeight = 0;
  livePhotoState.crop = null;
  livePhotoState.savedCrop = null;
  livePhotoState.cropDrag = null;
  if (livePhotoState.previewFrame) cancelAnimationFrame(livePhotoState.previewFrame);
  livePhotoState.previewFrame = 0;
  livePhotoState.editingId = "";
  els.contentVideo.value = "";
  els.livePhotoVideoInput.value = "";
  els.livePhotoGenerate.innerHTML = '<i data-lucide="image-plus"></i>插入图文';
}

function waitForLivePhotoSeek(video, target) {
  if (Math.abs(video.currentTime - target) < 0.03) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("封面帧读取超时。")), 8000);
    const done = () => {
      window.clearTimeout(timeout);
      video.removeEventListener("seeked", done);
      resolve();
    };
    video.addEventListener("seeked", done, { once: true });
    video.currentTime = target;
  });
}

async function captureLivePhotoCover() {
  const start = Math.max(0, Number(els.livePhotoStart.value) || 0);
  const coverOffset = Math.max(0, Number(els.livePhotoCover.value) || 0);
  await waitForLivePhotoSeek(els.livePhotoVideo, Math.min(livePhotoState.sourceDuration, start + coverOffset));
  const canvas = document.createElement("canvas");
  const videoWidth = els.livePhotoVideo.videoWidth;
  const videoHeight = els.livePhotoVideo.videoHeight;
  const crop = livePhotoState.crop || fullCropRect({ width: videoWidth, height: videoHeight });
  const sx = clamp(crop.x, 0, videoWidth - 1);
  const sy = clamp(crop.y, 0, videoHeight - 1);
  const sw = clamp(crop.width, 1, videoWidth - sx);
  const sh = clamp(crop.height, 1, videoHeight - sy);
  const targetAspect = sw / sh;
  let outputWidth;
  let outputHeight;
  if (targetAspect >= 1) {
    outputWidth = Math.max(1, Math.min(1440, Math.round(sw)));
    outputHeight = Math.max(1, Math.round(outputWidth / targetAspect));
  } else {
    outputHeight = Math.max(1, Math.min(1440, Math.round(sh)));
    outputWidth = Math.max(1, Math.round(outputHeight * targetAspect));
  }
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const resizedContext = canvas.getContext("2d");
  resizedContext.imageSmoothingEnabled = true;
  resizedContext.imageSmoothingQuality = "high";
  resizedContext.drawImage(els.livePhotoVideo, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);
  return canvas.toDataURL("image/jpeg", 0.95);
}

async function applyLivePhotoAsset(event) {
  event.preventDefault();
  if (!livePhotoSelectionIsValid() || livePhotoState.generating) return;
  livePhotoState.generating = true;
  updateLivePhotoGenerateState();
  setLivePhotoServiceMessage("正在保存视频素材并生成封面帧…");
  try {
    const editing = Boolean(livePhotoState.editingId);
    const id = livePhotoState.editingId || createImportedImageId();
    const videoKey = String(state.images[id]?.videoKey || id);
    const cover = await captureLivePhotoCover();
    const settings = normalizeLiveMediaSettings({
      duration: livePhotoState.duration,
      speed: livePhotoState.speed,
      aspect: livePhotoState.aspect,
      customAspect: livePhotoState.customAspect,
      start: Number(els.livePhotoStart.value) || 0,
      coverOffset: Number(els.livePhotoCover.value) || 0,
      sound: els.livePhotoSound ? els.livePhotoSound.checked : true,
      crop: normalizedLivePhotoCrop(),
    });
    await writeLiveMediaBlob(videoKey, livePhotoState.file);
    replaceLiveMediaCache(videoKey, livePhotoState.file, livePhotoState.file.name || state.images[id]?.videoName || "video.mov");
    // 封面或视频变了，drafts/ 里的旧文件不能再直接引用。
    const { draftEmbed: _previousEmbed, ...previousImage } = state.images[id] || {};
    state.images[id] = {
      ...previousImage,
      kind: "live",
      src: cover,
      name: state.images[id]?.name || `${livePhotoState.file.name || "视频"} · 实况`,
      videoKey,
      videoName: livePhotoState.file.name || state.images[id]?.videoName || "video.mov",
      videoType: livePhotoState.file.type || "video/quicktime",
      videoDuration: livePhotoState.sourceDuration,
      videoWidth: livePhotoState.sourceWidth,
      videoHeight: livePhotoState.sourceHeight,
      liveSettings: settings,
      crop: null,
      layout: state.images[id]?.layout || defaultNewImageLayout(),
    };
    if (!livePhotoState.editingId) insertImageTagsAtCursor([`[[image:${id}]]`]);
    updateImageList();
    livePhotoState.generating = false;
    closeLivePhotoModal();
    await render();
    els.status.textContent = editing
      ? "已更新实况素材"
      : livePhotoBrowserRenderSupported()
        ? "已插入实况图片；右侧下载会在本机浏览器里直接合成"
        : needsLivePhotoStaticFallback()
          ? "已插入实况图片；当前站点尚未连接云端实况服务"
          : cloudLivePhotoAvailable() && !isLocalHostSite()
            ? "已插入实况图片；右侧下载会自动交给云端 Mac 生成"
            : "已插入实况图片；右侧下载会自动生成发布包";
  } catch (error) {
    setLivePhotoServiceMessage(error?.message || "实况素材保存失败。", "error");
  } finally {
    livePhotoState.generating = false;
    updateLivePhotoGenerateState();
  }
}

// 渲染序号：切换账号/项目时旧渲染可能晚于新渲染完成，
// 没有这个守卫时，旧账号的卡片会覆盖新账号的预览（表现为“切换后页面没刷新”）。
let renderSequence = 0;

async function render() {
  const seq = ++renderSequence;
  await Promise.all([hydrateLiveMediaForState(), hydrateImageSourcesForState()]);
  if (seq !== renderSequence) return;
  const settings = readForm();
  updateDraftTitlePlaceholder();
  updateAppMode();
  updateArticleControls();
  if (state.appMode === "article") {
    renderArticlePreview(settings);
    saveState();
    return;
  }
  const pages = await buildPages(settings);
  if (seq !== renderSequence) return;
  state.canvases = pages.map((page, index) => renderPage(page, index, pages.length));
  drawPreview(state.canvases);
  saveState();
  scheduleLivePhotoPrewarm();
}

async function cancelStaleLivePhotoPrewarm(entry) {
  if (!entry || entry.stale) return;
  entry.stale = true;
  if (entry.cancel) {
    await entry.cancel().catch(() => undefined);
    return;
  }
  if (entry.promise) await entry.promise.catch(() => undefined);
}

async function prewarmLivePhotoCanvas(canvas, pageIndex) {
  const hits = liveImageHitsForCanvas(canvas);
  if (hits.length !== 1) return null;
  const imageId = String(hits[0].imageId);
  const image = state.images[imageId];
  if (!image || image.demoOnly || !liveMediaFiles.get(String(image.videoKey || imageId))?.blob) return null;

  const previous = livePhotoPrewarmState.jobs.get(imageId);
  if (previous?.canvas === canvas && (previous.promise || previous.result || previous.status === "failed")) {
    return previous.result || previous.promise;
  }
  if (previous) {
    await cancelStaleLivePhotoPrewarm(previous);
    if (livePhotoPrewarmState.jobs.get(imageId) === previous) livePhotoPrewarmState.jobs.delete(imageId);
  }

  const entry = {
    canvas,
    pageIndex,
    status: "preparing",
    result: null,
    promise: null,
    jobId: "",
    cancel: null,
    stale: false,
    error: "",
  };
  livePhotoPrewarmState.jobs.set(imageId, entry);
  entry.promise = (async () => {
    try {
      if (!(await ensureLivePhotoServiceReady())) throw new Error("云端实况服务暂时不可用。");
      if (livePhotoPrewarmState.jobs.get(imageId) !== entry) return null;
      const result = await generateLivePackageForCanvas(
        canvas,
        pageIndex,
        false,
        true,
        (stage, detail, cloudProgress, meta = {}) => {
          if (meta.jobId) entry.jobId = meta.jobId;
          if (meta.cancel) entry.cancel = meta.cancel;
          entry.status = stage === "complete" ? "complete" : "processing";
        },
      );
      if (livePhotoPrewarmState.jobs.get(imageId) !== entry || entry.stale) return null;
      entry.result = result;
      entry.status = "complete";
      entry.promise = null;
      els.status.textContent = "实况已在后台准备完成，点击下载时会直接使用。";
      return result;
    } catch (error) {
      if (livePhotoPrewarmState.jobs.get(imageId) === entry && !entry.stale) {
        entry.status = "failed";
        entry.error = error?.message || "后台实况准备失败。";
        entry.promise = null;
      }
      throw error;
    }
  })();
  els.status.textContent = "实况正在后台准备；你可以继续编辑内容。";
  return entry.promise;
}

function scheduleLivePhotoPrewarm() {
  window.clearTimeout(livePhotoPrewarmState.timer);
  livePhotoPrewarmState.timer = window.setTimeout(() => {
    livePhotoPrewarmState.timer = 0;
    if (!cloudLivePhotoAvailable() || !state.canvases.length) return;
    state.canvases.forEach((canvas, pageIndex) => {
      const hits = liveImageHitsForCanvas(canvas);
      if (hits.length === 1) void prewarmLivePhotoCanvas(canvas, pageIndex).catch(() => undefined);
    });
  }, 1200);
}

function drawPreview(canvases) {
  els.pages.innerHTML = "";
  els.pages.className = "pages";
  els.articleSettings.hidden = true;
  if (previewImageSelection && !String(els.content.value || "").includes(`[[image:${previewImageSelection.imageId}]]`)) {
    previewImageSelection = null;
  }
  if (!canvases.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "暂无内容";
    els.pages.append(empty);
  }

  canvases.forEach((canvas, index) => {
    const liveHits = liveImageHitsForCanvas(canvas);
    const shell = document.createElement("article");
    shell.className = "page-shell";
    shell.classList.toggle("has-live", liveHits.length > 0);
    const frame = document.createElement("div");
    frame.className = "page-frame";
    frame.append(canvas);
    frame.append(createImageEditLayer(canvas));
    attachPreviewImageDropHandlers(frame);
    frame.addEventListener("pointerdown", (event) => {
      if (!event.target.closest(".preview-image-box")) clearPreviewImageSelection();
    });

    const actions = document.createElement("div");
    actions.className = "page-actions";
    const label = document.createElement("span");
    label.textContent = `${liveHits.length ? "实况" : "图片"} ${String(index + 1).padStart(2, "0")}`;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.pageExport = "true";
    button.title = liveHits.length
      ? needsLivePhotoStaticFallback() ? "查看实况导出选项" : "自动生成 Live Photo 发布包"
      : "下载图片 ZIP";
    button.setAttribute("aria-label", liveHits.length ? `导出第 ${index + 1} 张实况` : `下载第 ${index + 1} 张`);
    button.innerHTML = `<i data-lucide="${liveHits.length ? "aperture" : "download"}"></i>`;
    const filename = `layout-page-${String(index + 1).padStart(2, "0")}.png`;
    button.addEventListener("click", () => exportCanvasAutomatically(canvas, filename, index));
    actions.append(label, button);
    shell.append(frame, actions);
    els.pages.append(shell);
  });

  const livePageCount = canvases.filter((canvas) => liveImageHitsForCanvas(canvas).length).length;
  els.pageCount.textContent = `${canvases.length} 张图片${livePageCount ? ` · ${livePageCount} 张实况` : ""}`;
  els.status.textContent = livePageCount && needsLivePhotoStaticFallback()
    ? `已生成 ${canvases.length} 张 · ${livePageCount} 张实况；当前站点尚未连接云端实况服务`
    : `已生成 ${canvases.length} 张${livePageCount ? `，其中 ${livePageCount} 张会自动导出 Live Photo` : ""}，高清尺寸 ${OUTPUT_CANVAS_WIDTH}x${OUTPUT_CANVAS_HEIGHT}`;
  syncExportBusyState();
  if (window.lucide) window.lucide.createIcons();
}

function imageHitIsPairable(hit) {
  if (!Number.isFinite(hit.sourceStart) || !Number.isFinite(hit.sourceEnd)) return false;
  const segment = els.content.value.slice(hit.sourceStart, hit.sourceEnd);
  return /^\s*\[\[image:[\w-]+\]\]\s*$/.test(segment);
}

// ===== 拼图调整弹窗 =====
// 拼图弹窗按草稿处理：打开时记下原样，关闭即回滚，只有「完成」才留下改动。
const pairEditor = {
  leftId: null,
  rightId: null,
  ratio: DEFAULT_PAIR_RATIO,
  originalRef: "",
  originalCrops: null,
  createdImageId: "",
};

function pairRefText(leftId, rightId, ratio) {
  const suffix = normalizePairRatio(ratio) === DEFAULT_PAIR_RATIO ? "" : `|${normalizePairRatio(ratio)}`;
  return `[[image:${leftId}|${rightId}${suffix}]]`;
}

/** 正文里已经没人引用这张图时，把它从素材里一并清掉，免得列表留空壳。 */
function dropUnreferencedImage(imageId) {
  if (!imageId || !state.images[imageId]) return;
  if (new RegExp(`\\[\\[image:(?:${imageId}\\b|[\\w-]+\\|${imageId}\\b)`).test(els.content.value)) return;
  delete state.images[imageId];
}

function pairModalIsOpen() {
  return Boolean(els.pairModal && !els.pairModal.classList.contains("hidden"));
}

function pairReferenceRegExp(leftId, rightId) {
  return new RegExp(`\\[\\[image:${leftId}\\|${rightId}(?:\\|[\\w-]+)?\\]\\]`);
}

// 把当前弹窗状态写回文本里的拼图引用
function writePairReference(nextLeftId, nextRightId, nextRatio) {
  const pattern = pairReferenceRegExp(pairEditor.leftId, pairEditor.rightId);
  if (!pattern.test(els.content.value)) return false;
  const ratioSuffix = nextRatio === DEFAULT_PAIR_RATIO ? "" : `|${nextRatio}`;
  els.content.value = els.content.value.replace(pattern, `[[image:${nextLeftId}|${nextRightId}${ratioSuffix}]]`);
  pairEditor.leftId = nextLeftId;
  pairEditor.rightId = nextRightId;
  pairEditor.ratio = nextRatio;
  requestRender();
  return true;
}

function drawPairEditorCell(canvas, imageId) {
  const data = state.images[imageId];
  if (!canvas || !data) return;
  const aspect = PAIR_RATIOS[pairEditor.ratio];
  // 单格比例 = (整体宽 - 中缝) / 2 : 整体高
  const cellAspect = (aspect - 5 / 780) / 2;
  const cssWidth = Math.min(250, Math.round(360 * cellAspect));
  const cssHeight = Math.round(cssWidth / cellAspect);
  canvas.width = cssWidth * 2;
  canvas.height = cssHeight * 2;
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  void loadImage(data.src).then((img) => {
    if (!pairModalIsOpen()) return;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawSourceCoverImage(ctx, img, getImageSourceRect(img, data.crop), 0, 0, canvas.width, canvas.height);
  }).catch(() => undefined);
}

function refreshPairEditor() {
  if (!pairModalIsOpen()) return;
  els.pairRatioButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.pairRatio === pairEditor.ratio);
  });
  drawPairEditorCell(els.pairCanvasLeft, pairEditor.leftId);
  drawPairEditorCell(els.pairCanvasRight, pairEditor.rightId);
}

function openPairEditor(leftId, rightId, ratio = DEFAULT_PAIR_RATIO, options = {}) {
  if (!els.pairModal || !state.images[leftId] || !state.images[rightId]) return;
  pairEditor.leftId = leftId;
  pairEditor.rightId = rightId;
  pairEditor.ratio = normalizePairRatio(ratio);
  // 取消时要还原到这一刻：正文里的引用、两张图各自的裁剪、以及刚加进来的那张图。
  pairEditor.originalRef = options.originalRef || pairRefText(leftId, rightId, pairEditor.ratio);
  pairEditor.originalCrops = {
    [leftId]: state.images[leftId]?.crop || null,
    [rightId]: state.images[rightId]?.crop || null,
  };
  pairEditor.createdImageId = options.createdImageId || "";
  els.pairModal.classList.remove("hidden");
  refreshPairEditor();
  if (window.lucide) window.lucide.createIcons();
}

function hidePairModal() {
  els.pairModal?.classList.add("hidden");
  pairEditor.originalRef = "";
  pairEditor.originalCrops = null;
  pairEditor.createdImageId = "";
}

/** 「完成」：改动就地留下。 */
function commitPairEditor() {
  hidePairModal();
}

/** 关闭 / Esc / 点遮罩：回到打开弹窗前的样子。 */
function cancelPairEditor() {
  if (!pairModalIsOpen()) return;
  const current = pairRefText(pairEditor.leftId, pairEditor.rightId, pairEditor.ratio);
  if (pairEditor.originalRef && els.content.value.includes(current)) {
    els.content.value = els.content.value.replace(current, pairEditor.originalRef);
  }
  for (const [id, crop] of Object.entries(pairEditor.originalCrops || {})) {
    if (state.images[id]) state.images[id].crop = crop;
  }
  const created = pairEditor.createdImageId;
  hidePairModal();
  dropUnreferencedImage(created);
  updateImageList();
  requestRender();
}

/** 删掉其中一张，另一张退回普通单图。 */
function removePairImage(side) {
  const keepId = side === "left" ? pairEditor.rightId : pairEditor.leftId;
  const dropId = side === "left" ? pairEditor.leftId : pairEditor.rightId;
  if (!keepId || !dropId) return;
  const current = pairRefText(pairEditor.leftId, pairEditor.rightId, pairEditor.ratio);
  if (!els.content.value.includes(current)) {
    els.status.textContent = "这张拼图的引用已变化，请关闭后重新打开";
    return;
  }
  commitTextHistory();
  els.content.value = els.content.value.replace(current, `[[image:${keepId}]]`);
  commitTextHistory();
  hidePairModal();
  dropUnreferencedImage(dropId);
  updateImageList();
  requestRender();
  els.status.textContent = `已删除${side === "left" ? "左" : "右"}图，这里恢复成单张图片`;
}

function setPairRatio(ratio) {
  const next = normalizePairRatio(ratio);
  if (!writePairReference(pairEditor.leftId, pairEditor.rightId, next)) {
    pairEditor.ratio = next;
  }
  refreshPairEditor();
}

function swapPairImages() {
  writePairReference(pairEditor.rightId, pairEditor.leftId, pairEditor.ratio);
  refreshPairEditor();
}

// 点预览图片右侧的加号：选一张新图，替换源文本为 [[image:旧|新]] 拼图
async function addPairImageToHit(hit) {
  const picker = document.createElement("input");
  picker.type = "file";
  picker.accept = "image/*";
  picker.addEventListener("change", async () => {
    const result = await addImageFiles(picker.files);
    const newId = result.ids[0];
    if (!newId) return;
    const value = els.content.value;
    const segment = value.slice(hit.sourceStart, hit.sourceEnd);
    let leftId = "";
    const replaced = segment.replace(
      /^(\s*)\[\[image:([\w-]+)\]\](\s*)$/,
      (whole, lead, id, tail) => {
        leftId = id;
        return `${lead}[[image:${id}|${newId}]]${tail}`;
      },
    );
    if (replaced === segment) {
      els.status.textContent = "这张图片的引用已变化，请重新选中后再拼图";
      return;
    }
    commitTextHistory();
    els.content.value = `${value.slice(0, hit.sourceStart)}${replaced}${value.slice(hit.sourceEnd)}`;
    commitTextHistory();
    updateImageList();
    requestRender();
    els.status.textContent = "已拼入第二张图；关闭弹窗可撤回，点「完成」才保留";
    openPairEditor(leftId, newId, DEFAULT_PAIR_RATIO, {
      originalRef: `[[image:${leftId}]]`,
      createdImageId: newId,
    });
  });
  picker.click();
}

function createImageEditLayer(canvas) {
  const layer = document.createElement("div");
  layer.className = "preview-image-edit-layer";

  for (const hit of canvas._imageHits || []) {
    const image = state.images[hit.imageId];
    const isLive = image?.kind === "live";
    const box = document.createElement("div");
    box.className = "preview-image-box";
    box.classList.toggle("is-live", isLive);
    box.classList.toggle("is-selected", previewImageSelectionMatchesHit(hit));
    box.dataset.imageId = hit.imageId;
    box.dataset.baseWidth = String(hit.baseWidth || hit.width);
    box.dataset.maxWidth = String(hit.maxWidth || CARD_CONTENT_WIDTH);
    box.dataset.resizeMaxWidth = String(hit.resizeMaxWidth || hit.baseWidth || hit.width);
    box.dataset.sourceStart = String(hit.sourceStart);
    box.dataset.sourceEnd = String(hit.sourceEnd);
    box.tabIndex = 0;
    box.setAttribute("role", "button");
    box.setAttribute("aria-label", `选择${isLive ? "实况" : "图片"} ${image?.name || hit.imageId}`);
    box.setAttribute("aria-selected", previewImageSelectionMatchesHit(hit) ? "true" : "false");
    box.title = isLive
      ? "点击选中后按 Backspace 删除；拖动可调整位置，右上角编辑，顶部调整对齐，右下角缩放"
      : "点击选中后按 Backspace 删除；拖动可调整位置，右上角裁剪，顶部调整对齐，右下角缩放";
    applyImageBoxStyle(box, hit);
    box.addEventListener("pointerdown", startPreviewImageMove);
    box.addEventListener("click", (event) => {
      selectPreviewImage({
        imageId: hit.imageId,
        sourceStart: hit.sourceStart,
        sourceEnd: hit.sourceEnd,
      });
      if (event.target === box) box.focus({ preventScroll: true });
    });
    box.addEventListener("focus", () => {
      selectPreviewImage({
        imageId: hit.imageId,
        sourceStart: hit.sourceStart,
        sourceEnd: hit.sourceEnd,
      });
    });

    if (isLive) {
      const video = createLivePreviewVideo(image, hit.imageId, "preview-live-video");
      if (video) box.append(video);
      const badge = document.createElement("span");
      badge.className = "preview-live-badge";
      badge.innerHTML = '<i data-lucide="aperture"></i>LIVE';
      box.append(badge);
    }

    const alignBar = document.createElement("div");
    alignBar.className = "preview-image-align";
    [
      ["left", "align-start-horizontal", "左对齐"],
      ["center", "align-center-horizontal", "居中"],
      ["right", "align-end-horizontal", "右对齐"],
    ].forEach(([align, icon, label]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.align = align;
      button.title = label;
      button.setAttribute("aria-label", label);
      button.innerHTML = `<i data-lucide="${icon}"></i>`;
      button.addEventListener("click", setPreviewImageAlign);
      alignBar.append(button);
    });

    const cropButton = document.createElement("button");
    cropButton.type = "button";
    cropButton.className = "preview-image-crop";
    cropButton.title = isLive ? "编辑当前实况" : "裁剪当前图片";
    cropButton.setAttribute("aria-label", isLive ? "编辑当前实况" : "裁剪当前图片");
    cropButton.innerHTML = `<i data-lucide="${isLive ? "aperture" : "crop"}"></i>`;
    cropButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (isLive) {
        openLivePhotoEditor(hit.imageId);
      } else {
        openCropper("image", hit.imageId);
      }
    });

    const resize = document.createElement("span");
    resize.className = "preview-image-resize";
    resize.dataset.action = "resize";
    resize.addEventListener("pointerdown", startPreviewImageResize);

    box.append(alignBar, cropButton, resize);

    // 单图（内部 [[image:id]] 语法）右侧提供加号：再选一张拼在右边
    if (!isLive && imageHitIsPairable(hit)) {
      const pairButton = document.createElement("button");
      pairButton.type = "button";
      pairButton.className = "preview-image-pair";
      pairButton.title = "再拼一张图在右边";
      pairButton.setAttribute("aria-label", "再拼一张图在右边");
      pairButton.innerHTML = '<i data-lucide="plus"></i>';
      pairButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        void addPairImageToHit(hit);
      });
      box.append(pairButton);
    }
    layer.append(box);
  }

  // 拼图块：点击打开拼图调整弹窗（比例、互换、分别裁剪）
  for (const item of canvas._page?.items || []) {
    if (item.type !== "imagePair" || item.cells.length < 2) continue;
    const box = document.createElement("div");
    box.className = "preview-image-box preview-pair-box";
    box.tabIndex = 0;
    box.setAttribute("role", "button");
    box.setAttribute("aria-label", "调整拼图");
    box.title = "点击调整拼图比例、互换或分别裁剪";
    applyImageBoxStyle(box, item);
    const badge = document.createElement("span");
    badge.className = "preview-pair-badge";
    badge.innerHTML = '<i data-lucide="layout-grid"></i>调整拼图';
    box.append(badge);
    const openFromItem = () => {
      const segment = els.content.value.slice(item.sourceStart, item.sourceEnd);
      const parsed = resolveInternalImagePairBlock(segment.trim());
      if (parsed) {
        openPairEditor(parsed.ids[0], parsed.ids[1], parsed.ratio, { originalRef: segment.trim() });
      }
    };
    box.addEventListener("click", openFromItem);
    box.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openFromItem();
      }
    });
    layer.append(box);
  }

  return layer;
}

function previewImageSelectionMatchesHit(hit) {
  if (!previewImageSelection || String(previewImageSelection.imageId) !== String(hit?.imageId || "")) return false;
  if (!Number.isFinite(previewImageSelection.sourceStart) || !Number.isFinite(hit?.sourceStart)) return true;
  return previewImageSelection.sourceStart === hit.sourceStart
    && previewImageSelection.sourceEnd === hit.sourceEnd;
}

function selectPreviewImage(selection) {
  if (!selection?.imageId || !state.images[selection.imageId]) return;
  previewImageSelection = {
    imageId: String(selection.imageId),
    sourceStart: Number(selection.sourceStart),
    sourceEnd: Number(selection.sourceEnd),
  };
  document.querySelectorAll(".preview-image-box").forEach((box) => {
    const selected = previewImageSelectionMatchesHit({
      imageId: box.dataset.imageId,
      sourceStart: Number(box.dataset.sourceStart),
      sourceEnd: Number(box.dataset.sourceEnd),
    });
    box.classList.toggle("is-selected", selected);
    box.setAttribute("aria-selected", selected ? "true" : "false");
  });
}

function clearPreviewImageSelection() {
  previewImageSelection = null;
  document.querySelectorAll(".preview-image-box.is-selected").forEach((box) => {
    box.classList.remove("is-selected");
    box.setAttribute("aria-selected", "false");
  });
}

function isEditablePreviewDeleteTarget(target) {
  const element = target instanceof Element ? target : null;
  if (!element) return false;
  return Boolean(element.closest("input, textarea, select, [contenteditable='true']"));
}

function selectedPreviewImageHit(content) {
  if (!previewImageSelection) return null;
  const imageId = String(previewImageSelection.imageId || "");
  const tag = `[[image:${imageId}]]`;
  if (!tag || !content.includes(tag)) return null;
  const expectedStart = Number(previewImageSelection.sourceStart);
  const expectedEnd = Number(previewImageSelection.sourceEnd);
  if (Number.isFinite(expectedStart) && Number.isFinite(expectedEnd) && content.slice(expectedStart, expectedEnd) === tag) {
    return { imageId, sourceStart: expectedStart, sourceEnd: expectedEnd };
  }
  const candidates = Array.from(content.matchAll(new RegExp(`\\[\\[image:${escapeRegExp(imageId)}\\]\\]`, "g")), (match) => match.index);
  const fallbackStart = candidates.sort((a, b) => Number.isFinite(expectedStart)
    ? Math.abs(a - expectedStart) - Math.abs(b - expectedStart)
    : a - b)[0];
  return !Number.isFinite(fallbackStart)
    ? null
    : { imageId, sourceStart: fallbackStart, sourceEnd: fallbackStart + tag.length };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function cleanUpDeletedImageAsset(imageId, image) {
  if (image?.kind !== "live") return;
  const key = String(image.videoKey || imageId);
  const prewarm = livePhotoPrewarmState.jobs.get(imageId);
  if (prewarm) {
    prewarm.stale = true;
    livePhotoPrewarmState.jobs.delete(imageId);
    void cancelStaleLivePhotoPrewarm(prewarm).catch(() => undefined);
  }
  const cached = liveMediaFiles.get(key);
  if (cached?.url) URL.revokeObjectURL(cached.url);
  liveMediaFiles.delete(key);
  try {
    await deleteLiveMediaBlob(key);
  } catch {
    // The image has already been removed from the document; cache cleanup can retry later.
  }
}

async function deleteSelectedPreviewImage() {
  if (isBuiltInProjectId(state.currentProjectId)) {
    els.status.textContent = "内置说明书不可修改，请先点击左上角“+”新建内容";
    return;
  }
  const content = String(els.content.value || "");
  const selected = selectedPreviewImageHit(content);
  if (!selected) {
    clearPreviewImageSelection();
    return;
  }

  const removal = imageRemovalRange(content, selected.sourceStart, selected.sourceEnd);
  const image = state.images[selected.imageId];
  commitTextHistory();
  els.content.value = `${content.slice(0, removal.start)}${content.slice(removal.end)}`;
  const stillReferenced = els.content.value.includes(`[[image:${selected.imageId}]]`);
  if (!stillReferenced) delete state.images[selected.imageId];
  clearPreviewImageSelection();
  updateImageList();
  saveState();
  commitTextHistory();
  await render();
  if (!stillReferenced) void cleanUpDeletedImageAsset(selected.imageId, image);
  els.status.textContent = `已删除${image?.kind === "live" ? "实况" : "图片"}${image?.name ? `：${image.name}` : ""}`;
}

function handlePreviewImageDeleteKey(event) {
  if (event.isComposing || !["Backspace", "Delete"].includes(event.key)) return;
  if (isEditablePreviewDeleteTarget(event.target)) return;
  const activeElement = document.activeElement;
  const activeBox = activeElement?.closest?.(".preview-image-box");
  const targetBox = event.target?.closest?.(".preview-image-box");
  if (!previewImageSelection || (!activeBox && !targetBox)) return;
  if (activeElement?.matches?.("button, input, textarea, select")) return;
  if (isBuiltInProjectId(state.currentProjectId)) {
    event.preventDefault();
    els.status.textContent = "内置说明书不可修改，请先点击左上角“+”新建内容";
    return;
  }
  event.preventDefault();
  void deleteSelectedPreviewImage();
}

function attachPreviewImageDropHandlers(frame) {
  const indicator = document.createElement("div");
  indicator.className = "preview-image-drop-line";
  indicator.hidden = true;
  frame.append(indicator);
}

function startPreviewImageMove(event) {
  const box = event.currentTarget;
  selectPreviewImage({
    imageId: box.dataset.imageId,
    sourceStart: Number(box.dataset.sourceStart),
    sourceEnd: Number(box.dataset.sourceEnd),
  });
  if (event.button !== 0 || event.target.closest("button, .preview-image-resize")) return;
  box.focus({ preventScroll: true });
  const sourceStart = Number(box.dataset.sourceStart);
  const sourceEnd = Number(box.dataset.sourceEnd);
  if (!Number.isFinite(sourceStart) || !Number.isFinite(sourceEnd)) return;
  event.preventDefault();
  event.stopPropagation();
  const boxRect = box.getBoundingClientRect();
  previewImageDrag = {
    imageId: box.dataset.imageId,
    sourceStart,
    sourceEnd,
    box,
    pointerId: event.pointerId,
    dropFrame: null,
    startClientX: event.clientX,
    startClientY: event.clientY,
    lastClientY: event.clientY,
    grabOffsetY: event.clientY - boxRect.top,
    boxHeight: boxRect.height,
    direction: 0,
    active: false,
  };
  box.setPointerCapture?.(event.pointerId);
  document.addEventListener("pointermove", movePreviewImagePointer);
  document.addEventListener("pointerup", stopPreviewImagePointer, { once: true });
  document.addEventListener("pointercancel", stopPreviewImagePointer, { once: true });
}

function movePreviewImagePointer(event) {
  if (!previewImageDrag) return;
  event.preventDefault();
  const dx = event.clientX - previewImageDrag.startClientX;
  const dy = event.clientY - previewImageDrag.startClientY;
  if (!previewImageDrag.active && Math.hypot(dx, dy) < 5) return;
  previewImageDrag.active = true;
  previewImageDrag.totalDeltaY = dy;
  previewImageDrag.direction = event.clientY > previewImageDrag.lastClientY + 1
    ? 1
    : event.clientY < previewImageDrag.lastClientY - 1
      ? -1
      : previewImageDrag.direction || (dy >= 0 ? 1 : -1);
  previewImageDrag.lastClientY = event.clientY;
  previewImageDrag.box.classList.add("is-dragging");
  previewImageDrag.box.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
  autoScrollPreviewDuringImageDrag(event.clientY);

  const frame = previewFrameAtPoint(event.clientX, event.clientY);
  if (!frame) {
    if (previewImageDrag.dropFrame) clearPreviewImageDropFrame(previewImageDrag.dropFrame);
    previewImageDrag.dropFrame = null;
    return;
  }
  if (previewImageDrag.dropFrame && previewImageDrag.dropFrame !== frame) {
    clearPreviewImageDropFrame(previewImageDrag.dropFrame);
  }
  previewImageDrag.dropFrame = frame;
  const canvas = frame.querySelector("canvas");
  setPreviewImageDropTarget(frame, canvas, event.clientY, previewImageDrag.direction);
}

function stopPreviewImagePointer(event) {
  document.removeEventListener("pointermove", movePreviewImagePointer);
  document.removeEventListener("pointerup", stopPreviewImagePointer);
  document.removeEventListener("pointercancel", stopPreviewImagePointer);
  if (!previewImageDrag) return;
  const frame = previewImageDrag.dropFrame;
  const drag = previewImageDrag;
  drag.box?.releasePointerCapture?.(drag.pointerId);
  let moved = false;
  if (drag.active && frame?._imageDropTarget) {
    moved = movePreviewImageMarkdown(drag.imageId, drag.sourceStart, drag.sourceEnd, frame._imageDropTarget);
  }
  stopPreviewImageDrag();
  if (drag.active && !moved) els.status.textContent = "图片位置没有变化，拖过蓝色落点线后松手即可移动";
  event?.preventDefault();
}

function stopPreviewImageDrag() {
  if (previewImageDrag?.box) {
    previewImageDrag.box.classList.remove("is-dragging");
    previewImageDrag.box.style.removeProperty("transform");
  }
  previewImageDrag = null;
  document.querySelectorAll(".page-frame.is-image-drop-target").forEach(clearPreviewImageDropFrame);
}

function previewFrameAtPoint(clientX, clientY) {
  const direct = document.elementFromPoint(clientX, clientY)?.closest(".page-frame");
  if (direct) return direct;
  let closest = null;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (const frame of document.querySelectorAll(".page-frame")) {
    const rect = frame.getBoundingClientRect();
    const dx = clientX < rect.left ? rect.left - clientX : clientX > rect.right ? clientX - rect.right : 0;
    const dy = clientY < rect.top ? rect.top - clientY : clientY > rect.bottom ? clientY - rect.bottom : 0;
    if (dx > 36 || dy > 44) continue;
    const distance = Math.hypot(dx, dy);
    if (distance < closestDistance) {
      closest = frame;
      closestDistance = distance;
    }
  }
  return closest;
}

function autoScrollPreviewDuringImageDrag(clientY) {
  const panel = document.querySelector(".preview-panel");
  if (!panel || panel.scrollHeight <= panel.clientHeight) return;
  const rect = panel.getBoundingClientRect();
  const edge = 64;
  if (clientY < rect.top + edge) panel.scrollTop -= Math.ceil((rect.top + edge - clientY) / 3);
  if (clientY > rect.bottom - edge) panel.scrollTop += Math.ceil((clientY - (rect.bottom - edge)) / 3);
}

function clearPreviewImageDropFrame(frame) {
  frame.classList.remove("is-image-drop-target");
  frame._imageDropTarget = null;
  const indicator = frame.querySelector(".preview-image-drop-line");
  if (indicator) indicator.hidden = true;
}

function setPreviewImageDropTarget(frame, canvas, clientY, direction = 0) {
  if (!previewImageDrag || !canvas) return;
  const rect = frame.getBoundingClientRect();
  const leadingEdgeOffset = direction > 0
    ? previewImageDrag.boxHeight - previewImageDrag.grabOffsetY
    : direction < 0
      ? -previewImageDrag.grabOffsetY
      : 0;
  const probeClientY = clientY + leadingEdgeOffset * 0.4;
  const logicalY = clamp(((probeClientY - rect.top) / rect.height) * CANVAS_HEIGHT, 0, CANVAS_HEIGHT);
  const rawTargets = (canvas._imageDropTargets || []).filter((target) => {
    return target.sourceEnd <= previewImageDrag.sourceStart || target.sourceStart >= previewImageDrag.sourceEnd;
  });
  const targets = rawTargets;
  let dropTarget = null;
  const shortDirectionalMove = direction && Math.abs(previewImageDrag.totalDeltaY || 0) <= 96;
  if (shortDirectionalMove) {
    const adjacent = direction > 0
      ? targets
          .filter((target) => target.sourceStart >= previewImageDrag.sourceEnd)
          .sort((a, b) => a.sourceStart - b.sourceStart)[0]
      : targets
          .filter((target) => target.sourceEnd <= previewImageDrag.sourceStart)
          .sort((a, b) => b.sourceEnd - a.sourceEnd)[0];
    if (adjacent) {
      dropTarget = {
        ...adjacent,
        after: direction > 0,
        indicatorY: direction > 0 ? adjacent.y + adjacent.height : adjacent.y,
      };
    }
  }
  for (const target of dropTarget ? [] : targets) {
    if (logicalY < target.y + target.height / 2) {
      dropTarget = { ...target, after: false, indicatorY: target.y };
      break;
    }
  }
  if (!dropTarget && targets.length) {
    const target = targets[targets.length - 1];
    dropTarget = { ...target, after: true, indicatorY: target.y + target.height };
  }
  if (!dropTarget) {
    const bounds = canvas._page?.bounds || { top: CARD_SIDE_PADDING, bottom: CARD_CONTENT_BOTTOM };
    dropTarget = {
      sourceStart: els.content.value.length,
      sourceEnd: els.content.value.length,
      after: true,
      indicatorY: bounds.bottom,
    };
  }
  frame._imageDropTarget = dropTarget;
  frame.classList.add("is-image-drop-target");
  const indicator = frame.querySelector(".preview-image-drop-line");
  indicator.hidden = false;
  indicator.style.top = `${(clamp(dropTarget.indicatorY, 0, CANVAS_HEIGHT) / CANVAS_HEIGHT) * 100}%`;
}

function markdownLineStart(content, index) {
  if (index <= 0) return 0;
  return content.lastIndexOf("\n", index - 1) + 1;
}

function markdownLineEnd(content, index) {
  const newline = content.indexOf("\n", clamp(index, 0, content.length));
  return newline === -1 ? content.length : newline + 1;
}

function imageRemovalRange(content, sourceStart, sourceEnd) {
  const lineStart = markdownLineStart(content, sourceStart);
  const lineEnd = markdownLineEnd(content, sourceEnd);
  const line = content.slice(lineStart, lineEnd).replace(/\n$/, "");
  if (isMarkdownImageBlock(line.trim())) {
    let end = lineEnd;
    if (end < content.length) {
      const followingLineEnd = markdownLineEnd(content, end);
      if (!content.slice(end, followingLineEnd).trim()) end = followingLineEnd;
    }
    return { start: lineStart, end };
  }
  return {
    start: clamp(sourceStart, 0, content.length),
    end: clamp(sourceEnd, sourceStart, content.length),
  };
}

function movePreviewImageMarkdown(imageId, sourceStart, sourceEnd, target) {
  const content = els.content.value;
  const removal = imageRemovalRange(content, sourceStart, sourceEnd);
  const moveStart = removal.start;
  const moveEnd = removal.end;
  const lineLevelTarget = target.targetKind === "text-line";
  const targetIndex = lineLevelTarget
    ? (target.after ? target.sourceEnd : target.sourceStart)
    : target.after
      ? markdownLineEnd(content, target.sourceEnd)
      : markdownLineStart(content, target.sourceStart);
  if (targetIndex >= moveStart && targetIndex <= moveEnd) return false;

  commitTextHistory();
  let chunk = `[[image:${imageId}]]`;
  const withoutSource = `${content.slice(0, moveStart)}${content.slice(moveEnd)}`;
  let insertionIndex = targetIndex > moveEnd ? targetIndex - (moveEnd - moveStart) : targetIndex;
  insertionIndex = clamp(insertionIndex, 0, withoutSource.length);
  if (!lineLevelTarget) {
    if (insertionIndex > 0 && withoutSource[insertionIndex - 1] !== "\n") chunk = `\n${chunk}`;
    if (insertionIndex < withoutSource.length && withoutSource[insertionIndex] !== "\n") chunk = `${chunk}\n`;
    if (!chunk.endsWith("\n")) chunk = `${chunk}\n`;
  }
  els.content.value = `${withoutSource.slice(0, insertionIndex)}${chunk}${withoutSource.slice(insertionIndex)}`;
  const movedTag = `[[image:${imageId}]]`;
  const movedSourceStart = els.content.value.indexOf(movedTag, Math.max(0, insertionIndex - 1));
  previewImageSelection = {
    imageId: String(imageId),
    sourceStart: movedSourceStart,
    sourceEnd: movedSourceStart === -1 ? -1 : movedSourceStart + movedTag.length,
  };
  els.content.focus({ preventScroll: true });
  els.content.setSelectionRange(insertionIndex, insertionIndex + chunk.length);
  scrollTextareaToRange(insertionIndex);
  commitTextHistory();
  updateImageList();
  requestRender();
  window.setTimeout(() => {
    els.status.textContent = "图片已移动，左侧 Markdown 顺序已同步";
  }, 320);
  return true;
}

function applyImageBoxStyle(box, hit) {
  box.style.left = `${(hit.x / CANVAS_WIDTH) * 100}%`;
  box.style.top = `${(hit.y / CANVAS_HEIGHT) * 100}%`;
  box.style.width = `${(hit.width / CANVAS_WIDTH) * 100}%`;
  box.style.height = `${(hit.height / CANVAS_HEIGHT) * 100}%`;
}

function scrollTextareaToRange(index) {
  const before = els.content.value.slice(0, index);
  const lineIndex = before.split("\n").length - 1;
  const lineHeight = Number.parseFloat(getComputedStyle(els.content).lineHeight) || 28;
  const targetTop = Math.max(0, lineIndex * lineHeight - els.content.clientHeight / 2);
  els.content.scrollTop = targetTop;
}

function setPreviewImageAlign(event) {
  event.preventDefault();
  event.stopPropagation();
  const align = event.currentTarget.dataset.align;
  const box = event.currentTarget.closest(".preview-image-box");
  const imageId = box?.dataset.imageId;
  if (!imageId || !state.images[imageId] || !["left", "center", "right"].includes(align)) return;

  state.images[imageId].layout = {
    ...normalizeImageLayout(state.images[imageId].layout),
    align,
  };
  saveState();
  render();
  els.status.textContent = align === "left" ? "图片已左对齐" : align === "right" ? "图片已右对齐" : "图片已居中";
}

function startPreviewImageResize(event) {
  const box = event.currentTarget.closest(".preview-image-box");
  const frame = box?.closest(".page-frame");
  const imageId = box?.dataset.imageId;
  if (!box || !frame || !imageId || !state.images[imageId]) return;

  event.preventDefault();
  event.stopPropagation();
  const frameRect = frame.getBoundingClientRect();
  imageEditDrag = {
    imageId,
    box,
    startX: event.clientX,
    startY: event.clientY,
    startLayout: normalizeImageLayout(state.images[imageId].layout),
    startBox: {
      x: (Number.parseFloat(box.style.left) / 100) * CANVAS_WIDTH,
      y: (Number.parseFloat(box.style.top) / 100) * CANVAS_HEIGHT,
      width: (Number.parseFloat(box.style.width) / 100) * CANVAS_WIDTH,
      height: (Number.parseFloat(box.style.height) / 100) * CANVAS_HEIGHT,
      baseWidth: Number(box.dataset.baseWidth) || (Number.parseFloat(box.style.width) / 100) * CANVAS_WIDTH,
      maxWidth: Number(box.dataset.maxWidth) || CARD_CONTENT_WIDTH,
      resizeMaxWidth: Number(box.dataset.resizeMaxWidth) || Number(box.dataset.baseWidth) || (Number.parseFloat(box.style.width) / 100) * CANVAS_WIDTH,
    },
    canvasScaleX: CANVAS_WIDTH / frameRect.width,
    canvasScaleY: CANVAS_HEIGHT / frameRect.height,
  };
  box.classList.add("is-resizing");
  box.setPointerCapture?.(event.pointerId);
  document.addEventListener("pointermove", movePreviewImageResize);
  document.addEventListener("pointerup", stopPreviewImageResize, { once: true });
}

function movePreviewImageResize(event) {
  if (!imageEditDrag) return;
  event.preventDefault();
  const dx = (event.clientX - imageEditDrag.startX) * imageEditDrag.canvasScaleX;
  const dy = (event.clientY - imageEditDrag.startY) * imageEditDrag.canvasScaleY;
  const nextLayout = resizeImageLayout(imageEditDrag.startLayout, imageEditDrag.startBox, dx, dy);
  state.images[imageEditDrag.imageId].layout = nextLayout;

  const nextWidth = imageEditDrag.startBox.baseWidth * nextLayout.widthScale;
  const nextHeight = nextWidth * (imageEditDrag.startBox.height / imageEditDrag.startBox.width);
  const maxOffset = Math.max(0, imageEditDrag.startBox.maxWidth - nextWidth);
  const nextX = nextLayout.align === "left" ? CARD_SIDE_PADDING : nextLayout.align === "right" ? CARD_SIDE_PADDING + maxOffset : CARD_SIDE_PADDING + maxOffset / 2;
  applyImageBoxStyle(imageEditDrag.box, {
    x: nextX,
    y: imageEditDrag.startBox.y,
    width: nextWidth,
    height: nextHeight,
  });
}

function stopPreviewImageResize() {
  if (!imageEditDrag) return;
  document.removeEventListener("pointermove", movePreviewImageResize);
  const imageId = imageEditDrag.imageId;
  imageEditDrag.box.classList.remove("is-resizing");
  imageEditDrag = null;
  saveState();
  render();
  els.status.textContent = `已调整图片 ${state.images[imageId]?.name || imageId}`;
}

function resizeImageLayout(startLayout, startBox, dx, dy) {
  const heightDrivenDelta = dy * (startBox.width / Math.max(1, startBox.height));
  const deltaWidth = Math.abs(dx) >= Math.abs(heightDrivenDelta) ? dx : heightDrivenDelta;
  const nextWidth = clamp(startBox.width + deltaWidth, startBox.resizeMaxWidth * 0.25, startBox.resizeMaxWidth);
  return {
    ...startLayout,
    widthScale: nextWidth / startBox.baseWidth,
    widthPercent: null,
    fixedWidth: null,
    fixedHeight: null,
  };
}

function liveImageHitsForCanvas(canvas) {
  return (canvas?._imageHits || []).filter((hit) => state.images[hit.imageId]?.kind === "live");
}

function createLiveWellMaskBlob(width, height, radius = 16) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#000";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#fff";
  roundedRect(context, 0, 0, width, height, Math.min(radius, width / 2, height / 2));
  context.fill();
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

function exportProgressElements(scope = "main") {
  if (scope === "handoff") {
    return {
      root: els.livePhotoHandoffProgress,
      title: els.livePhotoHandoffProgressTitle,
      detail: els.livePhotoHandoffProgressDetail,
      percent: els.livePhotoHandoffProgressPercent,
      meta: els.livePhotoHandoffProgressMeta,
      bar: els.livePhotoHandoffProgressBar,
      fill: els.livePhotoHandoffProgressFill,
    };
  }
  return {
    root: els.exportProgress,
    title: els.exportProgressTitle,
    detail: els.exportProgressDetail,
    percent: els.exportProgressPercent,
    meta: els.exportProgressMeta,
    bar: els.exportProgressBar,
    fill: els.exportProgressFill,
  };
}

function livePhotoHandoffDeviceText() {
  const userAgent = navigator.userAgent || "";
  const platform = /Mac/i.test(navigator.platform || userAgent) ? "Mac" : "当前设备";
  const browser = /Safari/i.test(userAgent) && !/(Chrome|Chromium|Edg)/i.test(userAgent)
    ? "Safari"
    : /Edg/i.test(userAgent)
      ? "Edge"
      : /(Chrome|Chromium)/i.test(userAgent)
        ? "Chrome"
        : "浏览器";
  return `已检测：${platform} · ${browser}`;
}

function livePhotoHandoffItemCopy(item) {
  const page = String(item.pageIndex + 1).padStart(2, "0");
  return item.type === "live"
    ? { page, label: "原生 Live Photo", extension: ".pvt", icon: "aperture" }
    : { page, label: "高清图片", extension: "PNG", icon: "image" };
}

function renderLivePhotoHandoffFiles() {
  if (!els.livePhotoHandoffFiles) return;
  const liveCount = livePhotoHandoffState.items.filter((item) => item.type === "live").length;
  const staticCount = livePhotoHandoffState.items.length - liveCount;
  if (livePhotoHandoffState.onlineFallback) {
    els.livePhotoHandoffFiles.innerHTML = `
      <div class="live-photo-package-card is-static-fallback">
        <div class="live-photo-package-lead">
          <span class="live-photo-package-icon"><i data-lucide="image" aria-hidden="true"></i></span>
          <span><strong>普通图片 .png</strong><small>当前在线站点只能导出静态图片，不能生成完整实况照片包。</small></span>
          <em>${livePhotoHandoffState.items.length} 张</em>
        </div>
      </div>
      <div class="live-photo-package-helper is-warning">
        <i data-lucide="info" aria-hidden="true"></i>
        <span><strong>为什么不是实况？</strong><small>在线站点还没有接入云端视频处理服务。这里下载的文件不会带“实况”标识。</small></span>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  // 用户要的是「我会拿到什么、接下来干什么」，不是 .pvt 里有哪几个文件。
  // 实现细节（JPG / MOV / 识别信息）一律不出现在界面上。
  const steps = `
    <ol class="live-photo-package-steps">
      <li><span>1</span>解压下载的 ZIP</li>
      <li><span>2</span>隔空投送给 iPhone</li>
      <li><span>3</span>在相册里长按播放</li>
    </ol>`;

  if (!livePhotoHandoffState.isBatch) {
    const single = livePhotoHandoffState.liveResults[0];
    const platform = single?.duration
      ? `${single.duration} 秒${Number(single.speed) > 1 ? ` · ${single.speed}× 倍速` : ""}`
      : "";
    els.livePhotoHandoffFiles.innerHTML = `
      <div class="live-photo-package-card">
        <div class="live-photo-package-row">
          <i data-lucide="aperture" aria-hidden="true"></i>
          <span><strong>实况照片</strong>${platform ? `<small>${platform}</small>` : ""}</span>
        </div>
      </div>
      ${steps}
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  const rows = [];
  if (liveCount) {
    rows.push(`<div class="live-photo-package-row">
      <i data-lucide="aperture" aria-hidden="true"></i>
      <span><strong>实况照片</strong></span>
      <em>${liveCount} 张</em>
    </div>`);
  }
  if (staticCount) {
    rows.push(`<div class="live-photo-package-row">
      <i data-lucide="image" aria-hidden="true"></i>
      <span><strong>高清图片</strong></span>
      <em>${staticCount} 张</em>
    </div>`);
  }
  els.livePhotoHandoffFiles.innerHTML = `
    <div class="live-photo-package-card">${rows.join("")}</div>
    ${liveCount ? steps : ""}
  `;
  if (window.lucide) window.lucide.createIcons();
}

function updateLivePhotoHandoffProgressSteps(activePageIndex = -1, completedPageIndexes = []) {
  if (!els.livePhotoHandoffProgressSteps) return;
  const completed = new Set(completedPageIndexes.map(Number));
  els.livePhotoHandoffProgressSteps.innerHTML = "";
  for (const item of livePhotoHandoffState.items) {
    const isComplete = completed.has(item.pageIndex);
    const isActive = item.pageIndex === activePageIndex && !isComplete;
    const copy = livePhotoHandoffItemCopy(item);
    const step = document.createElement("div");
    step.className = `handoff-progress-step${isComplete ? " is-complete" : isActive ? " is-active" : ""}`;
    step.innerHTML = `
      <span>${item.type === "live" ? "实况" : "图片"} ${copy.page}</span>
      <strong><i data-lucide="${isComplete ? "check" : isActive ? "loader-circle" : "clock-3"}" aria-hidden="true"></i>${isComplete ? "已完成" : isActive ? "处理中" : "等待中"}</strong>
    `;
    els.livePhotoHandoffProgressSteps.append(step);
  }
  if (window.lucide) window.lucide.createIcons();
}

function syncExportBusyState() {
  const mainBusy = exportProgressState.main.active;
  const handoffBusy = exportProgressState.handoff.active;
  const guideLocked = isBuiltInProjectId(state.currentProjectId);
  document.body.classList.toggle("export-busy", mainBusy || handoffBusy);
  [els.downloadZip, els.downloadArticle, els.downloadPdf, els.portableExport, els.saveToProject].filter(Boolean).forEach((button) => {
    button.disabled = mainBusy || guideLocked;
    button.setAttribute("aria-disabled", button.disabled ? "true" : "false");
    button.title = guideLocked ? GUIDE_DOWNLOAD_MESSAGE : "";
  });
  document.querySelectorAll("[data-page-export]").forEach((button) => {
    if (!button.dataset.enabledTitle) button.dataset.enabledTitle = button.title || "下载当前页面";
    button.disabled = mainBusy || guideLocked;
    button.setAttribute("aria-disabled", button.disabled ? "true" : "false");
    button.title = guideLocked ? GUIDE_DOWNLOAD_MESSAGE : button.dataset.enabledTitle;
  });
  if (els.livePhotoHandoffClose) {
    els.livePhotoHandoffClose.disabled = handoffBusy;
    els.livePhotoHandoffClose.setAttribute("aria-disabled", handoffBusy ? "true" : "false");
  }
}

function exportElapsedSeconds(scope) {
  const startedAt = exportProgressState[scope]?.startedAt || Date.now();
  return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
}

function refreshExportProgressMeta(scope) {
  const stateForScope = exportProgressState[scope];
  const elements = exportProgressElements(scope);
  if (!stateForScope.active || !elements.meta) return;
  const count = Number.isFinite(stateForScope.current) && Number.isFinite(stateForScope.total)
    ? `${stateForScope.current}/${stateForScope.total} · `
    : "";
  elements.meta.textContent = `${count}已用时 ${exportElapsedSeconds(scope)} 秒`;
}

function setExportProgressValue(scope, value) {
  const stateForScope = exportProgressState[scope];
  const elements = exportProgressElements(scope);
  if (!stateForScope || !elements.root) return;
  stateForScope.value = clamp(Math.round(finiteNumber(value, stateForScope.value || 0)), 0, 100);
  elements.percent.textContent = `${stateForScope.value}%`;
  elements.fill.style.width = `${stateForScope.value}%`;
  elements.bar.setAttribute("aria-valuemin", "0");
  elements.bar.setAttribute("aria-valuemax", "100");
  elements.bar.setAttribute("aria-valuenow", String(stateForScope.value));
  elements.bar.setAttribute("aria-valuetext", `已完成 ${stateForScope.value}%`);
}

function beginExportProgress(scope, options = {}) {
  const stateForScope = exportProgressState[scope];
  const elements = exportProgressElements(scope);
  if (!stateForScope || !elements.root || stateForScope.active) return false;
  window.clearTimeout(stateForScope.hideTimer);
  window.clearInterval(stateForScope.timer);
  stateForScope.active = true;
  stateForScope.startedAt = Date.now();
  stateForScope.current = Number.isFinite(options.current) ? options.current : null;
  stateForScope.total = Number.isFinite(options.total) ? options.total : null;
  stateForScope.value = 0;
  elements.root.hidden = false;
  elements.root.className = `export-progress${scope === "handoff" ? " export-progress-compact" : ""}`;
  elements.root.querySelector(".export-progress-icon").innerHTML = '<i data-lucide="loader-circle"></i>';
  elements.title.textContent = options.title || "正在准备导出";
  elements.detail.textContent = options.detail || "系统正在处理，请不要关闭页面。";
  setExportProgressValue(scope, Number.isFinite(options.value) ? options.value : 5);
  if (scope === "handoff") {
    updateLivePhotoHandoffProgressSteps(
      Number.isFinite(options.activePageIndex) ? options.activePageIndex : livePhotoHandoffState.items[0]?.pageIndex ?? -1,
      options.completedPageIndexes || [],
    );
  }
  refreshExportProgressMeta(scope);
  stateForScope.timer = window.setInterval(() => refreshExportProgressMeta(scope), 1000);
  syncExportBusyState();
  if (window.lucide) window.lucide.createIcons();
  return true;
}

function updateExportProgress(scope, options = {}) {
  const stateForScope = exportProgressState[scope];
  const elements = exportProgressElements(scope);
  if (!stateForScope?.active || !elements.root) return;
  if (options.title) elements.title.textContent = options.title;
  if (options.detail) elements.detail.textContent = options.detail;
  if (Number.isFinite(options.current)) stateForScope.current = options.current;
  if (Number.isFinite(options.total)) stateForScope.total = options.total;

  const hasCount = Number.isFinite(stateForScope.current) && Number.isFinite(stateForScope.total) && stateForScope.total > 0;
  const hasValue = Number.isFinite(options.value);
  const nextValue = hasValue
    ? options.value
    : hasCount
      ? (stateForScope.current / stateForScope.total) * 100
      : stateForScope.value;
  setExportProgressValue(scope, Math.max(stateForScope.value, nextValue));
  refreshExportProgressMeta(scope);
}

function finishExportProgress(scope, options = {}) {
  const stateForScope = exportProgressState[scope];
  const elements = exportProgressElements(scope);
  if (!stateForScope || !elements.root) return;
  const cancelled = options.cancelled === true;
  const success = !cancelled && options.success !== false;
  const elapsed = exportElapsedSeconds(scope);
  stateForScope.active = false;
  window.clearInterval(stateForScope.timer);
  stateForScope.timer = 0;
  elements.root.classList.remove("is-success", "is-error", "is-cancelled");
  elements.root.classList.add(cancelled ? "is-cancelled" : success ? "is-success" : "is-error");
  elements.root.querySelector(".export-progress-icon").innerHTML = `<i data-lucide="${cancelled ? "x" : success ? "check" : "circle-alert"}"></i>`;
  elements.title.textContent = options.title || (cancelled ? "已取消下载" : success ? "导出处理完成" : "导出没有完成");
  elements.detail.textContent = options.detail || (cancelled ? "没有写入或下载任何文件。" : success ? "文件已经准备好。" : "请根据提示处理后重试。");
  setExportProgressValue(scope, success ? 100 : cancelled ? 0 : stateForScope.value);
  elements.meta.textContent = `${cancelled ? "已取消" : success ? "完成" : "已停止"} · 用时 ${elapsed} 秒`;
  elements.bar.setAttribute("aria-valuetext", elements.detail.textContent);
  syncExportBusyState();
  if (window.lucide) window.lucide.createIcons();
  // 成功即收起——下载已经完成，不需要用户再看一段停留的完成态
  const delay = Number.isFinite(options.hideAfter) ? options.hideAfter : success ? 0 : cancelled ? 2400 : 5200;
  if (delay <= 0) {
    resetExportProgress(scope);
    return;
  }
  stateForScope.hideTimer = window.setTimeout(() => resetExportProgress(scope), delay);
}

function resetExportProgress(scope) {
  const stateForScope = exportProgressState[scope];
  const elements = exportProgressElements(scope);
  if (!stateForScope || !elements.root) return;
  window.clearInterval(stateForScope.timer);
  window.clearTimeout(stateForScope.hideTimer);
  stateForScope.active = false;
  stateForScope.timer = 0;
  stateForScope.hideTimer = 0;
  stateForScope.current = null;
  stateForScope.total = null;
  stateForScope.value = 0;
  elements.root.hidden = true;
  elements.root.className = `export-progress${scope === "handoff" ? " export-progress-compact" : ""}`;
  elements.percent.textContent = "0%";
  elements.fill.style.width = "0%";
  elements.bar.setAttribute("aria-valuenow", "0");
  if (scope === "handoff" && els.livePhotoHandoffProgressSteps) {
    els.livePhotoHandoffProgressSteps.innerHTML = "";
  }
  syncExportBusyState();
}

function waitForExportProgressPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

async function generateLivePackageForCanvas(canvas, pageIndex, reveal = true, serviceChecked = false, onStage = null) {
  onStage?.("validate", "正在检查实况素材和页面设置…");
  const hits = liveImageHitsForCanvas(canvas);
  if (!hits.length) return null;
  if (hits.length > 1) throw new Error(`第 ${pageIndex + 1} 页包含多段实况，稳妥首版请把它们拆到不同页面。`);
  const hit = hits[0];
  const image = state.images[hit.imageId];
  if (image?.demoOnly) {
    throw new Error("这是内置实况演示。请点击左上角“+”新建内容，再上传自己的视频后导出。");
  }
  const browserEngine = window.WriteThenPublishBrowserLivePhoto;
  const canRenderInBrowser = Boolean(browserEngine?.supported());
  if (!canRenderInBrowser && !serviceChecked && !(await ensureLivePhotoServiceReady())) {
    throw new Error("本机实况服务没有运行。请双击项目里的「启动写了就发.command」，保留终端窗口后再试。");
  }
  const media = liveMediaFiles.get(String(image.videoKey || hit.imageId));
  if (!media?.blob) {
    throw new Error(image.videoBackupSkipped
      ? "这段实况的原视频只保存在上传它的那台设备上（为节省云端空间不做备份）。请在那台设备导出，或在这里重新上传视频。"
      : "实况原视频已经丢失，请在左侧重新上传这段视频。");
  }

  // 浏览器自己就能合成实况，不必把原视频传上云再等一台云端 Mac。
  if (canRenderInBrowser) {
    const settings = normalizeLiveMediaSettings(image.liveSettings);
    const scale = 1080 / CANVAS_WIDTH;
    const wellX = clamp(Math.round(hit.x * scale), 0, 1080);
    const wellY = clamp(Math.round(hit.y * scale), 0, 1440);
    const result = await browserEngine.renderLivePhoto({
      videoBlob: media.blob,
      pageCanvas: canvas,
      well: {
        x: wellX,
        y: wellY,
        width: clamp(Math.round(hit.width * scale), 40, 1080 - wellX),
        height: clamp(Math.round(hit.height * scale), 40, 1440 - wellY),
      },
      durationSeconds: settings.duration,
      speed: settings.speed,
      start: settings.start,
      coverOffset: settings.coverOffset,
      focusX: settings.focusX,
      focusY: settings.focusY,
      sound: settings.sound,
      crop: settings.crop || null,
      title: `${projectTitleFromData(readForm())}-第${pageIndex + 1}页`,
      onProgress: ({ progress, detail }) => onStage?.("package", detail, progress),
    });
    return {
      ok: true,
      provider: "browser",
      pageIndex,
      job_id: result.assetId,
      asset_id: result.assetId,
      archive_blob: result.blob,
      archive_name: result.archiveName,
      archive_bytes: result.blob.size,
      archive_parts: result.parts,
      duration: settings.duration,
      speed: settings.speed,
    };
  }
  onStage?.("page", `正在生成第 ${pageIndex + 1} 页高清卡片…`);
  const pageBlob = await canvasToLivePagePngBlob(canvas);
  if (!pageBlob) throw new Error("卡片页面生成失败，请调整内容后再试。");
  const scale = 1080 / CANVAS_WIDTH;
  const wellX = clamp(Math.round(hit.x * scale), 0, 1080);
  const wellY = clamp(Math.round(hit.y * scale), 0, 1440);
  const wellWidth = clamp(Math.round(hit.width * scale), 40, 1080 - wellX);
  const wellHeight = clamp(Math.round(hit.height * scale), 40, 1440 - wellY);
  const maskBlob = await createLiveWellMaskBlob(wellWidth, wellHeight, Math.round(13 * scale));
  if (!maskBlob) throw new Error("实况圆角遮罩生成失败。");
  const settings = normalizeLiveMediaSettings(image.liveSettings);
  const title = `${projectTitleFromData(readForm())}-第${pageIndex + 1}页`;
  const manifest = {
    // platform 只为兼容还没升级的服务端；时长与倍速以 duration / speed 为准。
    platform: settings.duration === 3 ? "wechat" : "xhs",
    duration: settings.duration,
    speed: settings.speed,
    start: settings.start,
    cover_offset: settings.coverOffset,
    focus_x: settings.focusX,
    focus_y: settings.focusY,
    well_x: wellX,
    well_y: wellY,
    well_width: wellWidth,
    well_height: wellHeight,
    title,
    sound: settings.sound ? "1" : "0",
    ...(settings.crop ? {
      crop_x: settings.crop.x,
      crop_y: settings.crop.y,
      crop_width: settings.crop.width,
      crop_height: settings.crop.height,
    } : {}),
  };
  if (livePhotoState.serviceMode === "cloud") {
    onStage?.("package", "正在安全上传原视频，云端不会压缩源文件…", 8);
    const result = await cloudApi().createCloudLivePhotoJob(
      {
        video: { blob: media.blob, name: image.videoName || media.name || "video.mov" },
        page: { blob: pageBlob, name: `page-${String(pageIndex + 1).padStart(2, "0")}.png` },
        mask: { blob: maskBlob, name: "live-well-mask.png" },
      },
      manifest,
      ({ detail, progress, jobId, cancel }) => onStage?.("package", detail, progress, { jobId, cancel }),
    );
    result.pageIndex = pageIndex;
    result.duration = settings.duration;
    result.speed = settings.speed;
    return result;
  }
  const payload = new FormData();
  payload.append("video", media.blob, image.videoName || media.name || "video.mov");
  payload.append("page", pageBlob, `page-${String(pageIndex + 1).padStart(2, "0")}.png`);
  payload.append("mask", maskBlob, "live-well-mask.png");
  for (const [key, value] of Object.entries(manifest)) {
    payload.append(key, String(value));
  }
  payload.append("reveal", reveal ? "1" : "0");
  onStage?.("package", "正在合成 JPG、MOV 与 .pvt，这一步可能需要一些时间…");
  const response = await fetch(livePhotoApiUrl("/api/live-photo/render"), { method: "POST", body: payload });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) throw new Error(result.error || `第 ${pageIndex + 1} 页实况发布包生成失败。`);
  result.pageIndex = pageIndex;
  return result;
}

async function prepareLivePhotoPackageForCanvas(canvas, pageIndex, reveal = false, serviceChecked = false, onStage = null) {
  const hits = liveImageHitsForCanvas(canvas);
  const imageId = hits.length === 1 ? String(hits[0].imageId) : "";
  const cached = imageId ? livePhotoPrewarmState.jobs.get(imageId) : null;
  if (cached?.canvas === canvas) {
    if (cached.result) {
      onStage?.("package", "已复用后台准备好的实况发布包。", 100);
      return { ...cached.result, pageIndex };
    }
    if (cached.promise) {
      try {
        const result = await cached.promise;
        if (result) return { ...result, pageIndex };
      } catch {
        if (livePhotoPrewarmState.jobs.get(imageId) === cached) livePhotoPrewarmState.jobs.delete(imageId);
      }
    }
  } else if (cached) {
    await cancelStaleLivePhotoPrewarm(cached);
    if (livePhotoPrewarmState.jobs.get(imageId) === cached) livePhotoPrewarmState.jobs.delete(imageId);
  }
  return generateLivePackageForCanvas(canvas, pageIndex, reveal, serviceChecked, onStage);
}

function closeLivePhotoHandoff() {
  if (exportProgressState.handoff.active) return;
  resetExportProgress("handoff");
  els.livePhotoHandoffModal.classList.add("hidden");
  els.livePhotoHandoffPreview.innerHTML = "";
  els.livePhotoHandoffThumbnails.innerHTML = "";
  els.livePhotoHandoffFiles.innerHTML = "";
  els.livePhotoHandoffDevice.hidden = true;
  els.livePhotoHandoffPreviewHint.hidden = true;
  livePhotoHandoffState.onlineFallback = false;
  livePhotoHandoffState.onlineEntries = [];
  livePhotoHandoffState.pendingEntries = [];
  livePhotoHandoffState.prepared = false;
}

function createLivePhotoHandoffPreviewFrame(pageIndex, compact = false) {
  const sourceCanvas = state.canvases[pageIndex];
  if (!sourceCanvas) return document.createElement("div");
  const frame = document.createElement("div");
  frame.className = "live-photo-handoff-preview-frame";
  const previewCanvas = document.createElement("canvas");
  previewCanvas.width = sourceCanvas.width;
  previewCanvas.height = sourceCanvas.height;
  previewCanvas.getContext("2d").drawImage(sourceCanvas, 0, 0);
  frame.append(previewCanvas);

  liveImageHitsForCanvas(sourceCanvas).forEach((hit) => {
    const image = state.images[hit.imageId];
    if (!image) return;
    const well = document.createElement("div");
    well.className = "live-photo-handoff-video-well";
    well.style.left = `${(hit.x / CANVAS_WIDTH) * 100}%`;
    well.style.top = `${(hit.y / CANVAS_HEIGHT) * 100}%`;
    well.style.width = `${(hit.width / CANVAS_WIDTH) * 100}%`;
    well.style.height = `${(hit.height / CANVAS_HEIGHT) * 100}%`;
    const video = createLivePreviewVideo(image, hit.imageId, "live-photo-handoff-video");
    if (video) well.append(video);
    if (!compact) {
      const badge = document.createElement("span");
      badge.className = "live-photo-handoff-live-badge";
      badge.innerHTML = '<i data-lucide="aperture"></i>LIVE';
      well.append(badge);
    }
    frame.append(well);
  });
  return frame;
}

function selectLivePhotoHandoffPage(pageIndex) {
  const item = livePhotoHandoffState.items.find((entry) => entry.pageIndex === pageIndex) || livePhotoHandoffState.items[0] || null;
  if (!item) return;
  livePhotoHandoffState.selectedPageIndex = item.pageIndex;
  const result = item.type === "live" ? item.result : null;
  livePhotoHandoffState.selectedJobId = result?.job_id || "";
  els.livePhotoHandoffPreview.innerHTML = "";
  els.livePhotoHandoffPreview.append(createLivePhotoHandoffPreviewFrame(item.pageIndex));
  els.livePhotoHandoffThumbnails.querySelectorAll("[data-handoff-page]").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.handoffPage) === item.pageIndex);
  });
  if (livePhotoHandoffState.onlineFallback) {
    els.livePhotoHandoffReveal.disabled = true;
    els.livePhotoHandoffDownload.disabled = false;
  } else if (!livePhotoHandoffState.isBatch) {
    // 浏览器和云端生成的包都不在本机磁盘上，「在访达中显示」对它们没有意义。
    els.livePhotoHandoffReveal.disabled = !result || result.provider === "cloud" || result.provider === "browser";
    els.livePhotoHandoffDownload.disabled = !(result?.archive_url || result?.archive_blob);
  }
  if (window.lucide) window.lucide.createIcons();
}

async function fetchCloudLivePhotoArchive(result) {
  let response = await fetch(result.archive_url);
  if (!response.ok && result.cloud_access_token && cloudApi()?.getCloudLivePhotoJob) {
    const refreshed = await cloudApi().getCloudLivePhotoJob(result.job_id, result.cloud_access_token);
    if (refreshed.archive_url) {
      result.archive_url = refreshed.archive_url;
      result.archive_bytes = refreshed.archive_bytes || result.archive_bytes;
      response = await fetch(result.archive_url);
    }
  }
  if (!response.ok) throw new Error("云端实况下载地址已经失效，请重新生成。");
  return responseBlobWithProgress(response);
}

async function prepareCloudLivePhotoBatch() {
  if (!window.JSZip) throw new Error("浏览器没有加载 ZIP 组件，无法整理批量实况包。");
  const zip = new window.JSZip();
  for (const result of livePhotoHandoffState.liveResults) {
    const sourceBlob = await fetchCloudLivePhotoArchive(result);
    const sourceZip = await window.JSZip.loadAsync(sourceBlob);
    let copied = 0;
    const entries = [];
    sourceZip.forEach((path, entry) => {
      const marker = path.toLowerCase().indexOf(".pvt/");
      if (!entry.dir && marker >= 0) entries.push([path, entry, marker]);
    });
    for (const [path, entry, marker] of entries) {
      const relative = path.slice(Number(marker) + 5);
      if (!relative) continue;
      const data = await entry.async("arraybuffer");
      zip.file(`${String(result.pageIndex + 1).padStart(2, "0")}-实况.pvt/${relative}`, data);
      copied += 1;
    }
    if (!copied) throw new Error(`第 ${result.pageIndex + 1} 页云端包缺少完整 .pvt。`);
  }
  for (const file of livePhotoHandoffState.staticPackage?.files || []) {
    zip.file(`${String(file.pageIndex + 1).padStart(2, "0")}-图片.png`, file.blob);
  }
  const archiveBlob = await zip.generateAsync({
    type: "blob",
    compression: EXPORT_ZIP_COMPRESSION,
    mimeType: "application/zip",
  });
  if (!(await isZipBlob(archiveBlob))) throw new Error("云端批量 ZIP 整理失败。");
  return {
    ok: true,
    provider: "cloud",
    archive_blob: archiveBlob,
    archive_name: `${safeObsidianFileName(projectTitleFromData(readForm())) || "写了就发"}-全部内容.zip`,
    archive_bytes: archiveBlob.size,
    count: livePhotoHandoffState.items.length,
  };
}

/** 只有一张时收窄弹窗并改成上下排布——左右分栏会让右半边空一大片。 */
function syncLivePhotoHandoffDensity() {
  const card = els.livePhotoHandoffModal?.querySelector(".live-photo-handoff-card");
  if (!card) return;
  card.classList.toggle("is-single", livePhotoHandoffState.items.length <= 1);
}

/** 把浏览器生成的多页实况和普通页拼成一个 ZIP，全程不经过服务端。 */
async function prepareBrowserLivePhotoBatch() {
  if (!window.JSZip) throw new Error("打包组件没有加载，请刷新页面后重试。");
  const zip = new window.JSZip();
  for (const result of livePhotoHandoffState.liveResults) {
    const prefix = `${String(result.pageIndex + 1).padStart(2, "0")}-实况`;
    for (const part of result.archive_parts || []) {
      // .pvt 包直接与图片同级，不再在外面多套一层 ${prefix}/ 文件夹。
      zip.file(`${prefix}.pvt/${part.path.split("/").pop()}`, part.bytes);
    }
  }
  for (const file of livePhotoHandoffState.staticPackage?.files || []) {
    zip.file(`${String(file.pageIndex + 1).padStart(2, "0")}-图片.png`, file.blob);
  }
  const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
  return {
    ok: true,
    provider: "browser",
    archive_blob: blob,
    archive_name: `${projectTitleFromData(readForm())}-全部内容.zip`,
    archive_bytes: blob.size,
  };
}

async function ensureLivePhotoBatchPrepared() {
  if (livePhotoHandoffState.batch) return livePhotoHandoffState.batch;
  if (livePhotoHandoffState.batchPreparing) return livePhotoHandoffState.batchPreparing;
  const prepare = async () => {
    if (livePhotoHandoffState.liveResults.some((result) => result.provider === "cloud")) {
      const result = await prepareCloudLivePhotoBatch();
      livePhotoHandoffState.batch = result;
      return result;
    }
    // 浏览器生成的实况没有服务端任务号，总包直接在本地拼。
    if (livePhotoHandoffState.liveResults.some((result) => result.provider === "browser")) {
      const result = await prepareBrowserLivePhotoBatch();
      livePhotoHandoffState.batch = result;
      return result;
    }
    const payload = new FormData();
    payload.append("title", projectTitleFromData(readForm()));
    payload.append(
      "jobs",
      JSON.stringify(livePhotoHandoffState.liveResults.map((result) => ({ job_id: result.job_id, page_index: result.pageIndex }))),
    );
    for (const file of livePhotoHandoffState.staticPackage?.files || []) {
      payload.append(`static_${file.pageIndex}`, file.blob, file.filename);
    }
    const response = await fetch(livePhotoApiUrl("/api/live-photo/batch"), { method: "POST", body: payload });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.error || "批量发布包整理失败。");
    livePhotoHandoffState.batch = result;
    return result;
  };
  livePhotoHandoffState.batchPreparing = prepare().finally(() => {
    livePhotoHandoffState.batchPreparing = null;
  });
  return livePhotoHandoffState.batchPreparing;
}

async function preparePendingLivePhotoHandoffBatch() {
  if (livePhotoHandoffState.prepared) return ensureLivePhotoBatchPrepared();
  const entries = livePhotoHandoffState.pendingEntries;
  if (!entries.length) return ensureLivePhotoBatchPrepared();

  const liveEntries = entries.filter(([, canvas]) => liveImageHitsForCanvas(canvas).length);
  const staticEntries = entries.filter(([, canvas]) => !liveImageHitsForCanvas(canvas).length);
  const browserLiveReady = Boolean(window.WriteThenPublishBrowserLivePhoto?.supported());
  if (!browserLiveReady && !(await ensureLivePhotoServiceReady())) {
    throw new Error("实况生成服务暂时不可用，请检查网络后重试。");
  }
  const invalid = liveEntries.find(([, canvas]) => liveImageHitsForCanvas(canvas).length > 1);
  if (invalid) throw new Error(`第 ${invalid[0] + 1} 页包含多段实况，请先拆到不同页面。`);

  const completedPageIndexes = [];
  const liveResults = [];
  const pendingPageIndexes = new Set();
  // 云端每页是一次互相独立的 GitHub Actions 运行，串行等待会把耗时按页数叠加；
  // 浏览器合成走同一块硬件编码器，开两路让解码和编码互相错开就够；
  // 本机 ffmpeg 是单机 CPU 密集任务，并发只会互相抢核，所以仍然逐页处理。
  const liveConcurrency = browserLiveReady
    ? Math.min(2, liveEntries.length)
    : livePhotoState.serviceMode === "cloud"
      ? Math.min(3, liveEntries.length)
      : 1;

  function refreshLiveBatchProgress(detail, stageRatio = 0) {
    const current = Math.min(...pendingPageIndexes, staticEntries[0]?.[0] ?? Infinity);
    updateLivePhotoHandoffProgressSteps(Number.isFinite(current) ? current : -1, completedPageIndexes);
    updateExportProgress("handoff", {
      title: "正在生成全部内容",
      detail,
      current: completedPageIndexes.length,
      total: entries.length,
      value: 8 + ((completedPageIndexes.length + stageRatio) / entries.length) * 72,
    });
  }

  async function processLiveEntry([pageIndex, canvas]) {
    pendingPageIndexes.add(pageIndex);
    refreshLiveBatchProgress(`正在处理第 ${pageIndex + 1} / ${entries.length} 页 · 原生 Live Photo`);
    try {
      const result = await prepareLivePhotoPackageForCanvas(canvas, pageIndex, false, true, (stage, detail, cloudProgress) => {
        const stageRatio = Number.isFinite(cloudProgress)
          ? Math.max(0.1, Number(cloudProgress) / 100)
          : stage === "validate" ? 0.1 : stage === "page" ? 0.35 : 0.68;
        refreshLiveBatchProgress(detail, stageRatio);
      });
      liveResults.push(result);
      completedPageIndexes.push(pageIndex);
    } finally {
      pendingPageIndexes.delete(pageIndex);
    }
    refreshLiveBatchProgress(`已完成第 ${pageIndex + 1} / ${entries.length} 页 · 原生 Live Photo`);
  }

  const liveQueue = [...liveEntries];
  await Promise.all(
    Array.from({ length: Math.max(1, liveConcurrency) }, async () => {
      while (liveQueue.length) {
        await processLiveEntry(liveQueue.shift());
      }
    }),
  );

  let staticPackage = null;
  if (staticEntries.length) {
    updateLivePhotoHandoffProgressSteps(staticEntries[0][0], completedPageIndexes);
    staticPackage = await prepareStaticCanvasSubset(staticEntries, (progress) => {
      if (progress.type === "page" && !completedPageIndexes.includes(progress.pageIndex)) {
        completedPageIndexes.push(progress.pageIndex);
      }
      const nextStatic = staticEntries.find(([pageIndex]) => !completedPageIndexes.includes(pageIndex))?.[0] ?? -1;
      updateLivePhotoHandoffProgressSteps(nextStatic, completedPageIndexes);
      updateExportProgress("handoff", {
        title: "正在生成全部内容",
        detail: progress.type === "archive"
          ? "全部页面已经生成，正在整理批量发布包…"
          : `正在处理第 ${progress.pageIndex + 1} / ${entries.length} 页 · 高清 PNG`,
        current: completedPageIndexes.length,
        total: entries.length,
        value: progress.type === "archive" ? 84 : 8 + (completedPageIndexes.length / entries.length) * 72,
      });
    });
  }

  livePhotoHandoffState.liveResults = liveResults.sort((a, b) => a.pageIndex - b.pageIndex);
  livePhotoHandoffState.staticPages = staticEntries.map(([pageIndex]) => pageIndex).sort((a, b) => a - b);
  livePhotoHandoffState.staticPackage = staticPackage;
  livePhotoHandoffState.items = [
    ...livePhotoHandoffState.liveResults.map((result) => ({ type: "live", pageIndex: result.pageIndex, result })),
    ...livePhotoHandoffState.staticPages.map((pageIndex) => ({ type: "static", pageIndex })),
  ].sort((a, b) => a.pageIndex - b.pageIndex);
  livePhotoHandoffState.pendingEntries = [];
  livePhotoHandoffState.prepared = true;
  livePhotoHandoffState.batch = null;
  livePhotoHandoffState.batchPreparing = null;
  renderLivePhotoHandoffThumbnails();
  renderLivePhotoHandoffFiles();
  selectLivePhotoHandoffPage(livePhotoHandoffState.items[0]?.pageIndex ?? -1);
  updateLivePhotoHandoffProgressSteps(-1, completedPageIndexes);
  updateExportProgress("handoff", {
    title: "正在整理全部内容",
    detail: "全部页面已经生成，正在准备系统发送…",
    current: entries.length,
    total: entries.length,
    value: 88,
  });
  return ensureLivePhotoBatchPrepared();
}

async function responseBlobWithProgress(response, onProgress = null) {
  const total = Number(response.headers.get("content-length")) || 0;
  if (!response.body?.getReader || total <= 0) return response.blob();
  const reader = response.body.getReader();
  const chunks = [];
  let loaded = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    onProgress?.(loaded, total);
  }
  return new Blob(chunks, { type: response.headers.get("content-type") || "application/octet-stream" });
}

/** 只有本机服务生成的包才真的落在磁盘上；浏览器和云端生成的都由浏览器保存。 */
function livePhotoHandoffHasLocalFile() {
  const batchProvider = livePhotoHandoffState.batch?.provider;
  if (batchProvider === "cloud" || batchProvider === "browser") return false;
  const current = livePhotoHandoffState.liveResults.find(
    (result) => result.job_id === livePhotoHandoffState.selectedJobId,
  ) || livePhotoHandoffState.liveResults[0];
  return current?.provider !== "cloud" && current?.provider !== "browser";
}

async function revealLivePhotoHandoff() {
  const isBatch = livePhotoHandoffState.isBatch;
  if (!livePhotoHandoffHasLocalFile()) {
    els.status.textContent = "这个实况包由浏览器保存，请到浏览器的下载列表里查看。";
    return;
  }
  if (!isBatch && !livePhotoHandoffState.selectedJobId) return;
  let path = "/api/live-photo/reveal";
  let payload = { job_id: livePhotoHandoffState.selectedJobId };
  if (isBatch) {
    const batch = await ensureLivePhotoBatchPrepared();
    path = "/api/live-photo/batch-reveal";
    payload = { batch_id: batch.batch_id };
  }
  const response = await fetch(livePhotoApiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    els.status.textContent = result.error || "无法在 Finder 中显示导出内容。";
    return;
  }
  els.status.textContent = isBatch ? "已在 Finder 中显示本次批量导出。" : "已在 Finder 中显示这个实况包。";
}

/** 当前选中的这一页是不是浏览器生成、且系统分享面板可用（面板里就有隔空投送）。 */
function browserShareTargetForHandoff() {
  const engine = window.WriteThenPublishBrowserLivePhoto;
  if (!engine?.canShareLive || livePhotoHandoffState.isBatch) return null;
  const result = livePhotoHandoffState.liveResults.find(
    (item) => item.job_id === livePhotoHandoffState.selectedJobId,
  ) || livePhotoHandoffState.liveResults[0];
  if (result?.provider !== "browser" || !result.archive_parts) return null;
  const stem = result.archive_name.replace(/\.zip$/i, "");
  return engine.canShareLive(result.archive_parts, stem) ? { result, stem } : null;
}

async function airdropLivePhotoHandoff() {
  // 浏览器生成的实况没有落在本机磁盘上，走系统分享面板把 JPG + MOV 一起送出去，
  // iOS 会按身份码把它们认成同一张实况。
  const shareTarget = browserShareTargetForHandoff();
  if (shareTarget) {
    els.livePhotoHandoffAirdrop.disabled = true;
    try {
      const shared = await window.WriteThenPublishBrowserLivePhoto.shareLive(
        shareTarget.result.archive_parts,
        shareTarget.stem,
        "实况照片",
      );
      els.status.textContent = shared
        ? "已打开系统分享面板，选择隔空投送就能直接发到 iPhone。"
        : "已取消分享。";
    } catch (error) {
      els.status.textContent = error?.message || "系统分享面板没有打开，请改用下载。";
    }
    els.livePhotoHandoffAirdrop.disabled = false;
    return;
  }
  if (livePhotoHandoffState.onlineFallback) {
    window.open(LIVE_PHOTO_LOCAL_GUIDE_URL, "_blank", "noopener,noreferrer");
    els.status.textContent = "已打开 macOS 本地版说明；完整 Live Photo 发布包需要在本机生成。";
    return;
  }
  const isBatch = livePhotoHandoffState.isBatch;
  if (!isBatch && !livePhotoHandoffState.selectedJobId) return;
  if (!beginExportProgress("handoff", {
    title: isBatch ? "正在生成全部内容" : "正在打开 AirDrop",
    detail: isBatch ? "完成后将自动打开 AirDrop。" : "正在把实况发布包交给 macOS…",
    value: isBatch ? 5 : 72,
    current: isBatch ? 0 : null,
    total: isBatch ? livePhotoHandoffState.items.length : null,
    activePageIndex: isBatch ? livePhotoHandoffState.items[0]?.pageIndex : -1,
  })) return;
  els.livePhotoHandoffAirdrop.disabled = true;
  els.livePhotoHandoffDownload.disabled = true;
  els.livePhotoHandoffReveal.disabled = true;
  if (window.lucide) window.lucide.createIcons();
  try {
    await waitForExportProgressPaint();
    let path = "/api/live-photo/airdrop";
    let payload = { job_id: livePhotoHandoffState.selectedJobId };
    if (isBatch) {
      const batch = await preparePendingLivePhotoHandoffBatch();
      path = "/api/live-photo/batch-airdrop";
      payload = { batch_id: batch.batch_id };
    }
    updateExportProgress("handoff", {
      title: "正在打开系统 AirDrop",
      detail: isBatch ? `正在发送全部 ${livePhotoHandoffState.items.length} 个项目…` : "正在发送这个实况发布包…",
      current: isBatch ? livePhotoHandoffState.items.length : null,
      total: isBatch ? livePhotoHandoffState.items.length : null,
      value: 97,
    });
    const response = await fetch(livePhotoApiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.error || "无法打开 AirDrop 分享面板。");
    els.status.textContent = isBatch ? "整批内容已加入 AirDrop，请选择你的 iPhone。" : "AirDrop 分享面板已打开，请选择你的 iPhone。";
    updateExportProgress("handoff", {
      title: "AirDrop 已打开",
      detail: isBatch ? `全部 ${livePhotoHandoffState.items.length} 个项目已交给系统。` : "实况发布包已交给系统。",
      value: 100,
    });
    window.setTimeout(() => resetExportProgress("handoff"), 260);
  } catch (error) {
    els.status.textContent = error?.message || "无法打开 AirDrop 分享面板。";
    finishExportProgress("handoff", { success: false, title: "AirDrop 没有打开", detail: els.status.textContent });
  } finally {
    els.livePhotoHandoffAirdrop.disabled = false;
    els.livePhotoHandoffDownload.disabled = false;
    els.livePhotoHandoffReveal.disabled = isBatch ? !livePhotoHandoffState.batch : !livePhotoHandoffState.selectedJobId;
    els.livePhotoHandoffAirdrop.innerHTML = `<i data-lucide="share"></i>${isBatch ? "AirDrop 全部到手机" : "AirDrop"}`;
    if (window.lucide) window.lucide.createIcons();
  }
}

async function downloadOnlineLivePhotoAsImages() {
  const entries = livePhotoHandoffState.onlineEntries
    .map(([pageIndex, canvas]) => [pageIndex, canvas || state.canvases[pageIndex]])
    .filter(([, canvas]) => canvas);
  if (!entries.length) return;
  if (!beginExportProgress("handoff", {
    title: entries.length > 1 ? "正在生成全部图片版" : "正在生成当前图片版",
    detail: "在线版会把当前画面导出为高清 PNG，不会伪装成 Live Photo。",
    value: 5,
  })) return;

  let completed = false;
  els.livePhotoHandoffDownload.disabled = true;
  els.livePhotoHandoffAirdrop.disabled = true;
  els.livePhotoHandoffReveal.disabled = true;
  els.livePhotoHandoffDownload.innerHTML = '<i data-lucide="loader-circle"></i>正在生成图片版…';
  if (window.lucide) window.lucide.createIcons();

  try {
    if (entries.length === 1) {
      const [pageIndex, canvas] = entries[0];
      updateExportProgress("handoff", {
        title: "正在生成当前图片版",
        detail: `正在把第 ${pageIndex + 1} 页按当前画面导出为高清 PNG…`,
        value: 55,
      });
      const filename = `layout-page-${String(pageIndex + 1).padStart(2, "0")}-static.png`;
      const saved = await downloadCanvas(canvas, filename);
      if (!saved) {
        finishExportProgress("handoff", {
          cancelled: true,
          title: "已取消下载",
          detail: "没有写入任何文件，视频和排版仍保留在当前项目中。",
        });
        return;
      }
    } else {
      const packageResult = await prepareStaticCanvasSubset(entries, (progress) => {
        updateExportProgress("handoff", {
          title: `正在生成图片 ${progress.completed}/${progress.total}`,
          detail: progress.type === "archive" ? "图片已经生成，正在创建 ZIP…" : `第 ${progress.pageIndex + 1} 页已处理。`,
          current: progress.completed,
          total: progress.total,
          value: progress.type === "archive" ? 88 : 10 + (progress.completed / progress.total) * 70,
        });
      });
      updateExportProgress("handoff", { title: "正在保存图片版", detail: "文件已经生成，正在交给浏览器下载…", value: 96 });
      if (packageResult?.type === "zip") {
        await saveBlob(packageResult.blob, "graphic-layout-online-images.zip");
      } else {
        for (const file of packageResult?.files || []) await saveBlob(file.blob, file.filename);
      }
    }

    completed = true;
    els.livePhotoHandoffDownload.innerHTML = '<i data-lucide="check"></i>图片版已下载';
    els.livePhotoHandoffHint.textContent = "下载的是普通图片，不包含“实况”标识；视频素材仍保留在当前项目中。";
    els.status.textContent = entries.length > 1
      ? `已下载 ${entries.length} 页普通图片版；完整 Live Photo 仍需 macOS 本地版生成。`
      : "已下载当前普通图片版；完整 Live Photo 仍需 macOS 本地版生成。";
    finishExportProgress("handoff", {
      title: "普通图片版已下载",
      detail: entries.length > 1 ? `已按原顺序导出 ${entries.length} 页图片。` : "当前页面已经导出为高清 PNG。",
    });
  } catch (error) {
    els.status.textContent = error?.message || "普通图片版导出失败。";
    finishExportProgress("handoff", { success: false, title: "图片版导出失败", detail: els.status.textContent });
  } finally {
    els.livePhotoHandoffDownload.disabled = false;
    els.livePhotoHandoffAirdrop.disabled = false;
    if (!completed) els.livePhotoHandoffDownload.innerHTML = '<i data-lucide="download"></i>下载普通图片版';
    if (window.lucide) window.lucide.createIcons();
  }
}

async function downloadLivePhotoBatch() {
  if (livePhotoHandoffState.onlineFallback) {
    await downloadOnlineLivePhotoAsImages();
    return;
  }
  const isBatch = livePhotoHandoffState.isBatch;
  if (!beginExportProgress("handoff", {
    title: isBatch ? "正在生成全部内容" : "正在准备实况照片",
    detail: isBatch ? "系统正在处理 Live Photo 与普通图片…" : "正在整理完整 .pvt…",
    value: 5,
    current: isBatch ? 0 : null,
    total: isBatch ? livePhotoHandoffState.items.length : null,
    activePageIndex: isBatch ? livePhotoHandoffState.items[0]?.pageIndex : -1,
  })) return;
  els.livePhotoHandoffDownload.disabled = true;
  els.livePhotoHandoffAirdrop.disabled = true;
  els.livePhotoHandoffReveal.disabled = true;
  if (window.lucide) window.lucide.createIcons();
  try {
    await waitForExportProgressPaint();
    const archive = isBatch
      ? await preparePendingLivePhotoHandoffBatch()
      : livePhotoHandoffState.liveResults.find((result) => result.job_id === livePhotoHandoffState.selectedJobId)
        || livePhotoHandoffState.liveResults[0];
    if (!archive?.archive_url && !archive?.archive_blob) {
      throw new Error(isBatch ? "批量下载包没有准备完成。" : "实况下载包没有准备完成，请重新生成。");
    }
    updateExportProgress("handoff", {
      title: isBatch ? "正在下载全部内容" : "正在下载实况照片",
      detail: "下载包已经整理完成，正在传输 ZIP…",
      value: 40,
    });
    let archiveBlob = archive.archive_blob || null;
    if (!archiveBlob) {
      let response = await fetch(archive.archive_url);
      if (!response.ok && archive.provider === "cloud" && archive.cloud_access_token) {
        const refreshed = await cloudApi().getCloudLivePhotoJob(archive.job_id, archive.cloud_access_token);
        archive.archive_url = refreshed.archive_url || archive.archive_url;
        response = await fetch(archive.archive_url);
      }
      if (!response.ok) throw new Error(isBatch ? "批量压缩包下载失败。" : "实况照片压缩包下载失败。");
      archiveBlob = await responseBlobWithProgress(response, (loaded, total) => {
        updateExportProgress("handoff", {
          title: isBatch ? "正在下载全部内容" : "正在下载实况照片",
          detail: `已传输 ${(loaded / 1024 / 1024).toFixed(1)} MB / ${(total / 1024 / 1024).toFixed(1)} MB`,
          value: 40 + (loaded / total) * 50,
        });
      });
    }
    updateExportProgress("handoff", { title: "正在保存下载文件", detail: "传输完成，正在交给浏览器保存…", value: 96 });
    const archiveName = archive.archive_name || (isBatch ? "写了就发-批量导出.zip" : "写了就发-实况照片.zip");
    await saveBlob(archiveBlob, archiveName);
    els.livePhotoHandoffDownload.innerHTML = `<i data-lucide="check"></i>${isBatch ? "全部内容已下载" : "实况照片已下载"}`;
    els.livePhotoHandoffReveal.hidden = !livePhotoHandoffHasLocalFile();
    els.livePhotoHandoffHint.textContent = "";
    els.status.textContent = isBatch
      ? `已下载 ${livePhotoHandoffState.items.length} 页内容，ZIP 包含全部 .pvt、普通 PNG 和可编辑原稿。`
      : "实况照片 ZIP 已下载，解压后只有一个完整 .pvt。";
    updateLivePhotoHandoffProgressSteps(-1, livePhotoHandoffState.items.map((item) => item.pageIndex));
    finishExportProgress("handoff", {
      title: isBatch ? "全部内容下载完成" : "实况照片下载完成",
      detail: isBatch ? `已处理并下载 ${livePhotoHandoffState.items.length} 页内容。` : "完整实况照片包已经保存。",
    });
  } catch (error) {
    els.livePhotoHandoffDownload.disabled = false;
    els.livePhotoHandoffDownload.innerHTML = `<i data-lucide="download"></i>${isBatch ? "下载全部内容" : "下载实况照片"}`;
    els.status.textContent = error?.message || (isBatch ? "批量下载失败。" : "实况照片下载失败。");
    finishExportProgress("handoff", { success: false, title: isBatch ? "批量下载失败" : "实况照片下载失败", detail: els.status.textContent });
  }
  els.livePhotoHandoffAirdrop.disabled = false;
  els.livePhotoHandoffReveal.disabled = !livePhotoHandoffHasLocalFile()
    || (livePhotoHandoffState.isBatch ? !livePhotoHandoffState.batch : !livePhotoHandoffState.selectedJobId);
  if (window.lucide) window.lucide.createIcons();
}

function renderLivePhotoHandoffThumbnails() {
  els.livePhotoHandoffThumbnails.innerHTML = "";
  for (const item of livePhotoHandoffState.items) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "live-photo-handoff-thumbnail";
    button.dataset.handoffPage = String(item.pageIndex);
    button.append(createLivePhotoHandoffPreviewFrame(item.pageIndex, true));
    const label = document.createElement("span");
    label.textContent = `${item.type === "live" ? "实况" : "图片"} ${String(item.pageIndex + 1).padStart(2, "0")}`;
    button.append(label);
    button.addEventListener("click", () => selectLivePhotoHandoffPage(item.pageIndex));
    els.livePhotoHandoffThumbnails.append(button);
  }
}

function applyBatchLivePhotoHandoffCopy(liveCount, staticCount, total) {
  els.livePhotoHandoffTitle.textContent = "下载全部内容";
  els.livePhotoHandoffSummary.textContent = "";
  els.livePhotoHandoffDevice.hidden = true;
  els.livePhotoHandoffCount.textContent = "你会得到";
  els.livePhotoHandoffDetail.textContent = `${liveCount ? `${liveCount} 张实况照片` : ""}${liveCount && staticCount ? " · " : ""}${staticCount ? `${staticCount} 张图片` : ""}`;
  renderLivePhotoHandoffFiles();
  els.livePhotoHandoffAirdrop.hidden = true;
  els.livePhotoHandoffDownload.hidden = false;
  els.livePhotoHandoffDownload.disabled = false;
  els.livePhotoHandoffDownload.innerHTML = '<i data-lucide="download"></i>下载全部内容';
  els.livePhotoHandoffReveal.hidden = true;
  els.livePhotoHandoffReveal.innerHTML = '<i data-lucide="folder-open"></i>在 Finder 中找到';
  els.livePhotoHandoffHint.textContent = "";
  els.livePhotoHandoffPreviewHint.hidden = true;
  els.livePhotoHandoffThumbnails.hidden = false;
}

function showPendingLivePhotoBatchHandoff(entries) {
  resetExportProgress("main");
  resetExportProgress("handoff");
  livePhotoHandoffState.onlineFallback = false;
  livePhotoHandoffState.onlineEntries = [];
  livePhotoHandoffState.liveResults = [];
  livePhotoHandoffState.staticPages = entries
    .filter(([, canvas]) => !liveImageHitsForCanvas(canvas).length)
    .map(([pageIndex]) => pageIndex)
    .sort((a, b) => a - b);
  livePhotoHandoffState.staticPackage = null;
  livePhotoHandoffState.selectedJobId = "";
  livePhotoHandoffState.items = entries
    .map(([pageIndex, canvas]) => ({
      type: liveImageHitsForCanvas(canvas).length ? "live" : "static",
      pageIndex,
      result: null,
    }))
    .sort((a, b) => a.pageIndex - b.pageIndex);
  livePhotoHandoffState.isBatch = true;
  livePhotoHandoffState.batch = null;
  livePhotoHandoffState.batchPreparing = null;
  livePhotoHandoffState.pendingEntries = entries.map(([pageIndex, canvas]) => [pageIndex, canvas]);
  livePhotoHandoffState.prepared = false;
  renderLivePhotoHandoffThumbnails();

  const liveCount = livePhotoHandoffState.items.filter((item) => item.type === "live").length;
  const staticCount = livePhotoHandoffState.items.length - liveCount;
  applyBatchLivePhotoHandoffCopy(liveCount, staticCount, livePhotoHandoffState.items.length);
  syncLivePhotoHandoffDensity();
  els.livePhotoHandoffModal.classList.remove("hidden");
  selectLivePhotoHandoffPage(livePhotoHandoffState.items[0]?.pageIndex ?? -1);
  els.status.textContent = `已识别 ${livePhotoHandoffState.items.length} 页内容，可以下载完整 ZIP。`;
  if (window.lucide) window.lucide.createIcons();
}

function showLivePhotoHandoff(liveResults, staticEntries = [], staticPackage = null) {
  resetExportProgress("handoff");
  livePhotoHandoffState.onlineFallback = false;
  livePhotoHandoffState.onlineEntries = [];
  livePhotoHandoffState.liveResults = [...liveResults].sort((a, b) => a.pageIndex - b.pageIndex);
  livePhotoHandoffState.staticPages = staticEntries.map(([index]) => index).sort((a, b) => a - b);
  livePhotoHandoffState.staticPackage = staticPackage;
  livePhotoHandoffState.items = [
    ...livePhotoHandoffState.liveResults.map((result) => ({ type: "live", pageIndex: result.pageIndex, result })),
    ...livePhotoHandoffState.staticPages.map((pageIndex) => ({ type: "static", pageIndex })),
  ].sort((a, b) => a.pageIndex - b.pageIndex);
  livePhotoHandoffState.isBatch = livePhotoHandoffState.items.length > 1;
  livePhotoHandoffState.batch = null;
  livePhotoHandoffState.batchPreparing = null;
  livePhotoHandoffState.pendingEntries = [];
  livePhotoHandoffState.prepared = true;
  renderLivePhotoHandoffThumbnails();
  const liveCount = livePhotoHandoffState.liveResults.length;
  const staticCount = livePhotoHandoffState.staticPages.length;
  const total = livePhotoHandoffState.items.length;
  if (livePhotoHandoffState.isBatch) {
    applyBatchLivePhotoHandoffCopy(liveCount, staticCount, total);
  } else {
    const result = livePhotoHandoffState.liveResults[0];
    els.livePhotoHandoffDevice.hidden = true;
    els.livePhotoHandoffTitle.textContent = "下载实况照片";
    els.livePhotoHandoffSummary.textContent = "";
    els.livePhotoHandoffCount.textContent = "你会得到";
    els.livePhotoHandoffDetail.textContent = `1 张实况照片${result.archive_bytes ? ` · ${formatLivePhotoFileSize(result.archive_bytes)}` : ""}`;
    renderLivePhotoHandoffFiles();
    // 暂不暴露系统分享：canShare 会对 JPG+MOV 返回 true，但 Chrome/macOS 的面板里
    // 实测没有隔空投送，按钮点了等于没反应。等确认哪些浏览器真能投再放出来。
    els.livePhotoHandoffAirdrop.hidden = true;
    els.livePhotoHandoffDownload.hidden = false;
    els.livePhotoHandoffDownload.disabled = !(result.archive_url || result.archive_blob);
    els.livePhotoHandoffDownload.innerHTML = `<i data-lucide="download"></i>下载实况照片${result.archive_bytes ? `　${formatLivePhotoFileSize(result.archive_bytes)}` : ""}`;
    els.livePhotoHandoffReveal.hidden = true;
    els.livePhotoHandoffReveal.innerHTML = '<i data-lucide="folder-open"></i>在 Finder 中找到';
    els.livePhotoHandoffHint.textContent = "";
    els.livePhotoHandoffPreviewHint.hidden = false;
    els.livePhotoHandoffThumbnails.hidden = false;
  }
  syncLivePhotoHandoffDensity();
  els.livePhotoHandoffModal.classList.remove("hidden");
  selectLivePhotoHandoffPage(livePhotoHandoffState.items[0]?.pageIndex ?? -1);
  if (window.lucide) window.lucide.createIcons();
}

function showOnlineLivePhotoFallback(entries) {
  resetExportProgress("main");
  resetExportProgress("handoff");
  livePhotoHandoffState.onlineFallback = true;
  livePhotoHandoffState.onlineEntries = entries;
  livePhotoHandoffState.liveResults = [];
  livePhotoHandoffState.staticPages = [];
  livePhotoHandoffState.staticPackage = null;
  livePhotoHandoffState.selectedJobId = "";
  livePhotoHandoffState.items = entries
    .map(([pageIndex, canvas]) => ({
      type: liveImageHitsForCanvas(canvas).length ? "live" : "static",
      pageIndex,
      result: null,
    }))
    .sort((a, b) => a.pageIndex - b.pageIndex);
  livePhotoHandoffState.isBatch = livePhotoHandoffState.items.length > 1;
  livePhotoHandoffState.batch = null;
  livePhotoHandoffState.batchPreparing = null;
  livePhotoHandoffState.pendingEntries = [];
  livePhotoHandoffState.prepared = false;
  renderLivePhotoHandoffThumbnails();

  const liveCount = livePhotoHandoffState.items.filter((item) => item.type === "live").length;
  const staticCount = livePhotoHandoffState.items.length - liveCount;
  const total = livePhotoHandoffState.items.length;
  els.livePhotoHandoffDevice.hidden = true;
  els.livePhotoHandoffTitle.textContent = "在线实况下载尚未开放";
  els.livePhotoHandoffSummary.textContent = "当前在线站点还没有云端视频处理服务，不能生成完整 .pvt。";
  els.livePhotoHandoffCount.textContent = "暂时只能下载普通图片版";
  els.livePhotoHandoffDetail.textContent = `共 ${total} 页 · ${liveCount} 页包含实况${staticCount ? ` · ${staticCount} 张普通图片` : ""}`;
  renderLivePhotoHandoffFiles();
  els.livePhotoHandoffAirdrop.hidden = true;
  els.livePhotoHandoffDownload.hidden = false;
  els.livePhotoHandoffDownload.disabled = false;
  els.livePhotoHandoffDownload.innerHTML = `<i data-lucide="download"></i>${livePhotoHandoffState.isBatch ? "下载全部图片版" : "下载当前图片版"}`;
  els.livePhotoHandoffReveal.hidden = true;
  els.livePhotoHandoffReveal.disabled = true;
  els.livePhotoHandoffHint.textContent = "ZIP 中包含普通 PNG 和可编辑原稿；图片不会显示“实况”标识。";
  els.livePhotoHandoffPreviewHint.hidden = livePhotoHandoffState.isBatch;
  els.livePhotoHandoffThumbnails.hidden = false;
  syncLivePhotoHandoffDensity();
  els.livePhotoHandoffModal.classList.remove("hidden");
  selectLivePhotoHandoffPage(livePhotoHandoffState.items[0]?.pageIndex ?? -1);
  els.status.textContent = "在线版可以预览实况，但云端 .pvt 生成服务尚未接通。";
  if (window.lucide) window.lucide.createIcons();
}

async function exportCanvasAutomatically(canvas, filename, pageIndex) {
  if (blockBuiltInGuideDownload()) return;
  const hits = liveImageHitsForCanvas(canvas);
  if (hits.length && needsLivePhotoStaticFallback()) {
    showOnlineLivePhotoFallback([[pageIndex, canvas]]);
    return;
  }
  if (!beginExportProgress("main", {
    title: hits.length ? `正在处理第 ${pageIndex + 1} 页实况` : `正在导出第 ${pageIndex + 1} 张图片`,
    detail: "正在准备页面素材…",
    value: 5,
  })) return;
  if (!hits.length) {
    updateExportProgress("main", { title: `正在导出第 ${pageIndex + 1} 张图片`, detail: "请准备 ZIP 下载，随后会生成高清 PNG。", value: 55 });
    const saved = await downloadCanvas(canvas, filename);
    finishExportProgress("main", {
      success: saved,
      cancelled: !saved,
      title: saved ? "图片导出完成" : "图片导出已取消",
      detail: saved ? filename : "没有写入或下载任何文件。",
    });
    return;
  }
  els.status.textContent = `正在生成第 ${pageIndex + 1} 页 Live Photo 发布包…`;
  try {
    const result = await prepareLivePhotoPackageForCanvas(canvas, pageIndex, false, false, (stage, detail, cloudProgress) => {
      updateExportProgress("main", {
        title: `正在处理第 ${pageIndex + 1} 页实况`,
        detail,
        value: Number.isFinite(cloudProgress)
          ? 8 + Number(cloudProgress) * 0.84
          : stage === "validate" ? 12 : stage === "page" ? 32 : 62,
      });
    });
    updateExportProgress("main", { title: "正在打开实况导出面板", detail: "Live Photo 发布包已经生成。", value: 95 });
    showLivePhotoHandoff([result]);
    els.status.textContent = result.provider === "cloud"
      ? `第 ${pageIndex + 1} 页云端实况包已生成，可以直接下载。`
      : `第 ${pageIndex + 1} 页实况包已生成，可在电脑中显示或直接 AirDrop。`;
    finishExportProgress("main", {
      title: "Live Photo 已生成",
      detail: result.provider === "cloud"
        ? "导出面板已经打开，可以下载完整实况包。"
        : "导出面板已经打开，可以在电脑中显示或 AirDrop。",
    });
  } catch (error) {
    els.status.textContent = error?.message || "Live Photo 发布包生成失败。";
    finishExportProgress("main", {
      success: false,
      title: "Live Photo 生成失败",
      detail: error?.message || "请检查网络或实况服务后重试。",
    });
  }
}

async function downloadCanvas(canvas, filename) {
  const archiveName = filename.replace(/\.[^.]+$/, "") + ".zip";
  const blob = await canvasToLosslessPngBlob(canvas);
  if (!blob) {
    els.status.textContent = "图片生成失败，请调整内容后再试";
    return false;
  }
  await saveBlob(blob, filename);
  els.status.textContent = `已交给浏览器下载 ${archiveName}`;
  return true;
}

async function prepareDownloadZip(blob, filename) {
  if (!window.JSZip) throw new Error("ZIP 组件未加载，请刷新页面后下载。");
  const existingZip = /\.zip$/i.test(filename);
  const zip = existingZip ? await window.JSZip.loadAsync(blob) : new window.JSZip();
  if (!existingZip) zip.file(filename, blob);
  if (Object.keys(zip.files).some((path) => /(?:^|\/)manifest\.json$/.test(path))) return { blob, filename };
  // 发布图片/实况包同时包含可编辑原稿，同一个 ZIP 可直接导入复用。
  saveState();
  const project = state.projects.find((item) => item.id === state.currentProjectId);
  if (project && !isBuiltInProject(project)) {
    const root = `原稿/${projectFolderName(project)}`;
    await writePortableProject(project, (path, value) => zip.file(`${root}/${path}`, value));
  }
  return {
    blob: await zip.generateAsync({ type: "blob", compression: "STORE", streamFiles: true }),
    filename: existingZip ? filename : filename.replace(/\.[^.]+$/, "") + ".zip",
  };
}

async function saveBlob(blob, filename, writable = null) {
  ({ blob, filename } = await prepareDownloadZip(blob, filename));
  if (writable) {
    await writable.write(blob);
    await writable.close();
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const HTML2CANVAS_COLOR_PROPERTIES = [
  ["color", "color"],
  ["background-color", "backgroundColor"],
  ["border-top-color", "borderTopColor"],
  ["border-right-color", "borderRightColor"],
  ["border-bottom-color", "borderBottomColor"],
  ["border-left-color", "borderLeftColor"],
  ["outline-color", "outlineColor"],
  ["text-decoration-color", "textDecorationColor"],
];

function resolveExportColor(value, context) {
  const source = String(value || "").trim();
  if (!/\bcolor\(/i.test(source) || !context) return source;

  // html2canvas 1.x 不能解析浏览器已计算出的 color(srgb …)；
  // Canvas 2D 能识别同一颜色，把它读取为普通 rgba 后再交给 html2canvas。
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = "#010203";
  context.fillStyle = source;
  if (context.fillStyle === "#010203" && source !== "#010203") return source;
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
  return `rgba(${red}, ${green}, ${blue}, ${Math.round((alpha / 255) * 10000) / 10000})`;
}

function normalizeArticleExportColors(clonedDocument) {
  const article = clonedDocument.querySelector(".article-preview");
  const clonedWindow = clonedDocument.defaultView;
  const colorCanvas = clonedDocument.createElement("canvas");
  colorCanvas.width = 1;
  colorCanvas.height = 1;
  const colorContext = colorCanvas.getContext("2d", { willReadFrequently: true });
  if (!article || !clonedWindow || !colorContext) return;

  [article, ...article.querySelectorAll("*")].forEach((element) => {
    const computed = clonedWindow.getComputedStyle(element);
    HTML2CANVAS_COLOR_PROPERTIES.forEach(([property, computedProperty]) => {
      const source = computed[computedProperty];
      const normalized = resolveExportColor(source, colorContext);
      if (normalized && normalized !== source) element.style.setProperty(property, normalized);
    });
  });
}

function renderArticleCanvas(article) {
  return window.html2canvas(article, {
    // 编辑/导出按钮只是预览里的操作入口，不该被印进长图。
    ignoreElements: (node) => node.classList?.contains("article-live-actions"),
    // 导出副本里将 color-mix() 计算出的 color(srgb …) 转成 rgba，
    // 避免 html2canvas 1.x 在新版浏览器中报“不支持 color()”。
    onclone: normalizeArticleExportColors,
    backgroundColor: null,
    scale: Math.min(2, window.devicePixelRatio || 1),
    useCORS: true,
    imageTimeout: 15000,
    width: article.scrollWidth,
    height: article.scrollHeight,
    windowWidth: Math.max(document.documentElement.clientWidth, article.scrollWidth),
    windowHeight: Math.max(document.documentElement.clientHeight, article.scrollHeight),
  });
}

async function downloadArticleImage() {
  if (blockBuiltInGuideDownload()) return;
  const settings = readForm();
  if (state.appMode !== "article") {
    state.appMode = "article";
    updateAppMode();
  }
  renderArticlePreview(settings);

  const article = els.pages.querySelector(".article-preview");
  if (!article) {
    els.status.textContent = "长文生成失败，请先检查内容";
    return;
  }

  if (!window.html2canvas) {
    els.status.textContent = "长图下载组件未加载，请刷新页面后重试";
    return;
  }

  if (!beginExportProgress("main", {
    title: "正在生成长文图片",
    detail: "正在准备完整文章画面…",
    value: 5,
  })) return;

  const filename = "write-then-publish-article.png";
  try {
    updateExportProgress("main", { title: "请准备 ZIP 下载", detail: "将生成高清长图和可编辑原稿 ZIP。", value: 18 });
    els.status.textContent = "正在生成长图...";
    updateExportProgress("main", { title: "正在渲染完整长文", detail: "正在合成长文主题、文字和图片…", value: 42 });
    const canvas = await renderArticleCanvas(article);
    updateExportProgress("main", { title: "正在生成 PNG", detail: "长文画面已渲染，正在转换为高清图片…", value: 82 });
    const blob = await canvasToLosslessPngBlob(canvas);
    if (!blob) throw new Error("长图生成失败，请调整内容后再试");
    updateExportProgress("main", { title: "正在保存长图", detail: "图片已经生成，正在写入下载位置…", value: 96 });
    await saveBlob(blob, filename);
    els.status.textContent = "已交给浏览器下载 write-then-publish-article.zip";
    finishExportProgress("main", { title: "长图下载完成", detail: els.status.textContent });
  } catch (error) {
    els.status.textContent = error?.message || "长图下载失败，请稍后重试";
    finishExportProgress("main", { success: false, title: "长图下载失败", detail: els.status.textContent });
  }
}

function canvasToLosslessPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("图片生成失败，请刷新页面后重试。"));
      }, EXPORT_IMAGE_MIME);
    } catch (error) {
      if (error?.name === "SecurityError" || /tainted canvas/i.test(String(error?.message || ""))) {
        reject(new Error("当前内容包含浏览器不允许导出的网络图片。请重新上传头像或相关图片后再试。"));
        return;
      }
      reject(error);
    }
  });
}

// 实况合成时 ffmpeg 会把卡片缩到 1080x1440 再叠视频，所以按 1728x2304 上传纯属浪费：
// 云端要多传约 3MB，runner 还要再下载一次。这里先缩到成片尺寸，画质与服务端缩放等价。
function canvasToLivePagePngBlob(canvas) {
  const target = document.createElement("canvas");
  target.width = LIVE_PAGE_WIDTH;
  target.height = LIVE_PAGE_HEIGHT;
  const context = target.getContext("2d");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(canvas, 0, 0, LIVE_PAGE_WIDTH, LIVE_PAGE_HEIGHT);
  return canvasToLosslessPngBlob(target);
}

async function isZipBlob(blob) {
  const header = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
  return header[0] === 0x50 && header[1] === 0x4b && (header[2] === 0x03 || header[2] === 0x05 || header[2] === 0x07);
}

async function downloadCanvasesIndividually(onProgress = null) {
  for (const [index, canvas] of state.canvases.entries()) {
    const filename = `layout-page-${String(index + 1).padStart(2, "0")}.png`;
    await downloadCanvas(canvas, filename);
    onProgress?.(index + 1, state.canvases.length);
  }
}

async function prepareStaticCanvasSubset(entries, onProgress = null) {
  if (!entries.length) return null;
  const files = [];
  for (const [index, canvas] of entries) {
    const blob = await canvasToLosslessPngBlob(canvas);
    if (!blob) throw new Error(`第 ${index + 1} 页 PNG 生成失败。`);
    files.push({ blob, filename: `layout-page-${String(index + 1).padStart(2, "0")}.png`, pageIndex: index });
    onProgress?.({ type: "page", pageIndex: index, completed: files.length, total: entries.length });
  }
  if (!window.JSZip) {
    return { type: "files", files, count: entries.length };
  }
  const zip = new window.JSZip();
  for (const file of files) {
    zip.file(file.filename, file.blob);
  }
  onProgress?.({ type: "archive", completed: files.length, total: entries.length });
  const blob = await zip.generateAsync({
    type: "blob",
    compression: EXPORT_ZIP_COMPRESSION,
    mimeType: "application/zip",
  });
  if (!(await isZipBlob(blob))) throw new Error("普通图片压缩包生成异常。");
  return { type: "zip", blob, filename: "graphic-layout-static-pages.zip", files, count: entries.length };
}

async function downloadAll() {
  if (blockBuiltInGuideDownload()) return;
  if (!state.canvases.length) return;
  const entries = state.canvases.map((canvas, index) => [index, canvas]);
  const liveEntries = entries.filter(([, canvas]) => liveImageHitsForCanvas(canvas).length);
  if (liveEntries.length && needsLivePhotoStaticFallback()) {
    showOnlineLivePhotoFallback(entries);
    return;
  }
  if (liveEntries.length) {
    showPendingLivePhotoBatchHandoff(entries);
    return;
  }
  if (!beginExportProgress("main", {
    title: "正在准备批量导出",
    detail: "正在识别普通图片和 Live Photo…",
    value: 5,
  })) return;

  if (!window.JSZip) {
    els.status.textContent = "ZIP 组件未加载，请刷新页面后下载。";
    finishExportProgress("main", { success: false, title: "ZIP 组件未加载", detail: els.status.textContent });
    return;
  }

  const zipFilename = "graphic-layout-pages.zip";
  els.status.textContent = "正在打包图片...";
  try {
    const zip = new window.JSZip();
    for (const [index, canvas] of state.canvases.entries()) {
      updateExportProgress("main", {
        title: `正在生成高清图片 ${index + 1}/${state.canvases.length}`,
        detail: `正在处理第 ${index + 1} 页…`,
        current: index,
        total: state.canvases.length,
        value: 10 + (index / state.canvases.length) * 65,
      });
      const blob = await canvasToLosslessPngBlob(canvas);
      if (!blob) {
        els.status.textContent = "图片生成失败，请调整内容后再试";
        finishExportProgress("main", { success: false, title: "图片生成失败", detail: els.status.textContent });
        return;
      }
      const filename = `layout-page-${String(index + 1).padStart(2, "0")}.png`;
      zip.file(filename, blob);
      updateExportProgress("main", {
        title: `已生成高清图片 ${index + 1}/${state.canvases.length}`,
        detail: `第 ${index + 1} 页已经处理完成。`,
        current: index + 1,
        total: state.canvases.length,
        value: 10 + ((index + 1) / state.canvases.length) * 65,
      });
    }
    updateExportProgress("main", { title: "正在压缩下载文件", detail: "所有图片已经生成，正在创建 ZIP 压缩包…", value: 85 });
    const blob = await zip.generateAsync({
      type: "blob",
      compression: EXPORT_ZIP_COMPRESSION,
      mimeType: "application/zip",
    });

    if (!(await isZipBlob(blob))) {
      els.status.textContent = "打包文件异常，已改为逐张下载";
      await downloadCanvasesIndividually();
      finishExportProgress("main", { success: false, title: "ZIP 打包异常", detail: "已改为逐张下载图片。" });
      return;
    }

    updateExportProgress("main", { title: "正在保存批量文件", detail: "ZIP 已生成，正在交给浏览器下载…", value: 96 });
    await saveBlob(blob, zipFilename);
    els.status.textContent = `已下载 ${state.canvases.length} 张图片压缩包`;
    finishExportProgress("main", { title: "批量下载完成", detail: els.status.textContent });
  } catch (error) {
    console.error(error);
    els.status.textContent = "打包失败，已改为逐张下载";
    await downloadCanvasesIndividually();
    finishExportProgress("main", { success: false, title: "批量打包失败", detail: "已尝试改为逐张下载图片。" });
  }
}

const requestRender = debounce(render, 120);

// 图文卡片按 6 英寸宽排版，高度跟随卡片比例，每张卡片占一页。
const PRINT_CARD_PAGE_WIDTH_IN = 6;
// 打印用的 iframe 要等打印对话框关闭后才能移除；下一次打印前也会清掉残留。
let printFrameCleanup = null;

function printDocumentTitle() {
  const project = state.projects.find((item) => item.id === state.currentProjectId);
  const title = String(project?.title || "").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").trim().slice(0, 80);
  return title || "write-then-publish";
}

const PRINT_HEADER_RIGHT = "草帽路飞";
const PRINT_FOOTER_LEFT = "AIInfraGuide全栈学习课程";
// 页边框不能合并选择器，每个框都要单独写一遍样式。
const PRINT_MARGIN_BOX_STYLE = 'font: 9pt Inter, -apple-system, "PingFang SC", sans-serif; color: #6b7280;';

/** 转成 CSS 字符串字面量，用于 @page 页边框的 content；< 转义后标题里的 </style> 也不会截断样式。 */
function cssStringLiteral(value) {
  return `"${String(value).replace(/[\\"]/g, "\\$&").replace(/</g, "\\3C ").replace(/[\r\n]+/g, " ")}"`;
}

function articlePrintContent(article, title) {
  const stylesheets = [...document.querySelectorAll('link[rel="stylesheet"]')]
    .map((link) => `<link rel="stylesheet" href="${escapeHtml(link.href)}">`)
    .join("");
  // @page 不写 size：一旦指定纸张，Chrome 会锁住打印对话框里的「纸张尺寸」。
  // 页边距由 @page 控制，正文铺满可打印区域，用户可在对话框里改纸张、边距和缩放。
  // 页眉页脚用 @page 页边框绘制，counter(pages) 由浏览器在分页后填入总页数。
  const css = `
    @page {
      margin: 18mm 16mm;
      @top-left { content: ${cssStringLiteral(title)}; ${PRINT_MARGIN_BOX_STYLE} }
      @top-right { content: ${cssStringLiteral(PRINT_HEADER_RIGHT)}; ${PRINT_MARGIN_BOX_STYLE} }
      @bottom-left { content: ${cssStringLiteral(PRINT_FOOTER_LEFT)}; ${PRINT_MARGIN_BOX_STYLE} }
      @bottom-right { content: counter(page) "/" counter(pages); ${PRINT_MARGIN_BOX_STYLE} }
    }
    /* styles.css 把 body 锁成一屏高并隐藏溢出，打印时要放开，否则只印出第一页。 */
    html, body { display: block; height: auto; margin: 0; overflow: visible; background: #fff; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .article-preview { width: auto; min-height: 0; margin: 0; padding: 0; border: 0; border-radius: 0; box-shadow: none; }
    .article-preview video, .article-live-badge, .article-live-actions { display: none !important; }
    .article-preview img, .article-preview figure, .article-preview pre, .article-preview blockquote, .article-preview tr { break-inside: avoid; }
    .article-preview :is(h1, h2, h3, h4, h5, h6) { break-after: avoid; }
  `;
  // 主题样式是写在页面里的 <style>，不在样式表链接里，要单独带上
  const themeCss = els.articleThemeStyle.textContent.replace(/<\/style/gi, "<\\/style");
  return { head: `${stylesheets}<style>${themeCss}</style><style>${css}</style>`, body: article.outerHTML };
}

async function cardPrintContent(objectUrls) {
  for (const canvas of state.canvases) {
    objectUrls.push(URL.createObjectURL(await canvasToLosslessPngBlob(canvas)));
  }
  const { width, height } = state.canvases[0];
  const pageWidth = PRINT_CARD_PAGE_WIDTH_IN;
  const pageHeight = Math.round((pageWidth * height * 1000) / width) / 1000;
  // 图片比页面略矮一点，避免浏览器取整后把每张图挤出一张空白页。
  const css = `
    @page { size: ${pageWidth}in ${pageHeight}in; margin: 0; }
    html, body { margin: 0; }
    img { display: block; width: ${pageWidth}in; height: calc(${pageHeight}in - 2px); object-fit: contain; break-after: page; }
    img:last-child { break-after: auto; }
  `;
  const body = objectUrls.map((url, index) => `<img src="${url}" alt="第 ${index + 1} 页">`).join("");
  return { head: `<style>${css}</style>`, body };
}

/** 用浏览器打印功能导出 PDF：用户在打印对话框里选择「存为 PDF」。 */
async function downloadPdf() {
  if (blockBuiltInGuideDownload()) return;
  printFrameCleanup?.();
  const isArticle = state.appMode === "article";
  let article = null;
  if (isArticle) {
    renderArticlePreview(readForm());
    article = els.pages.querySelector(".article-preview");
    if (!article) {
      els.status.textContent = "长文生成失败，请先检查内容";
      return;
    }
  } else if (!state.canvases.length) {
    return;
  }

  const objectUrls = [];
  const frame = document.createElement("iframe");
  const previousTitle = document.title;
  const cleanup = () => {
    if (printFrameCleanup === cleanup) printFrameCleanup = null;
    document.title = previousTitle;
    frame.remove();
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
  };
  printFrameCleanup = cleanup;

  try {
    els.status.textContent = "正在准备打印页面...";
    const title = printDocumentTitle();
    const content = isArticle ? articlePrintContent(article, title) : await cardPrintContent(objectUrls);
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    frame.srcdoc = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>${content.head}</head><body>${content.body}</body></html>`;
    await new Promise((resolve) => {
      frame.addEventListener("load", resolve, { once: true });
      document.body.append(frame);
    });
    const printWindow = frame.contentWindow;
    await printWindow.document.fonts?.ready;
    await Promise.all([...printWindow.document.images].map((image) => image.decode().catch(() => {})));
    printWindow.addEventListener("afterprint", () => window.setTimeout(cleanup, 0), { once: true });
    // 部分浏览器把顶层页面标题当作「存为 PDF」的默认文件名。
    document.title = title;
    printWindow.focus();
    printWindow.print();
    els.status.textContent = "已打开打印对话框，目标打印机选择「存为 PDF」即可保存";
  } catch (error) {
    console.error(error);
    cleanup();
    els.status.textContent = error?.message || "打印页面准备失败，请稍后重试";
  }
}

function positionToolPopover(menu) {
  const popover = menu.querySelector(".tool-popover");
  if (!popover) return;

  popover.style.left = "";
  popover.style.right = "";

  if (window.matchMedia("(max-width: 620px)").matches) return;

  const margin = 12;
  const menuRect = menu.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  let left = 0;

  const overflowRight = menuRect.left + popoverRect.width - (window.innerWidth - margin);
  if (overflowRight > 0) left -= overflowRight;

  const overflowLeft = menuRect.left + left - margin;
  if (overflowLeft < 0) left -= overflowLeft;

  popover.style.left = `${Math.round(left)}px`;
}

function positionOpenToolPopovers() {
  document.querySelectorAll(".tool-menu[open]").forEach(positionToolPopover);
}

function bindEvents() {
  document.querySelectorAll(".tool-menu").forEach((menu) => {
    const summary = menu.querySelector("summary");
    const popover = menu.querySelector(".tool-popover");
    summary?.addEventListener("click", () => {
      if (menu.open) return;
      document.querySelectorAll(".tool-menu").forEach((other) => {
        if (other !== menu) other.open = false;
      });
    });
    menu.addEventListener("toggle", () => {
      if (!menu.open) return;
      document.querySelectorAll(".tool-menu").forEach((other) => {
        if (other !== menu) other.open = false;
      });
      requestAnimationFrame(() => positionToolPopover(menu));
    });
    if (menu.classList.contains("settings-menu")) {
      popover?.addEventListener("mouseleave", () => {
        menu.open = false;
      });
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (event.target.closest?.(".tool-menu, .selection-toolbar")) return;
    document.querySelectorAll(".tool-menu[open]").forEach((menu) => {
      menu.open = false;
    });
    hideSelectionToolbar();
  });

  window.addEventListener("resize", positionOpenToolPopovers);
  window.addEventListener("resize", applyPanelLayout);

  els.panelResizers.forEach((resizer) => {
    resizer.addEventListener("pointerdown", startPanelResize);
  });

  document.querySelectorAll(".toolbar [data-format]").forEach((button) => {
    button.addEventListener("click", () => {
      wrapSelection(button.dataset.format);
      button.closest(".tool-menu")?.removeAttribute("open");
    });
  });

  els.modeButtons.forEach((button) => {
    button.addEventListener("click", (event) => openLatestProjectOfType(event.currentTarget.dataset.appMode));
  });

  renderArticleThemeOptions();
  els.articleThemeList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-article-theme]");
    if (button) setArticleOption("theme", button.dataset.articleTheme);
  });
  els.articleCodeThemeList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-article-code-theme]");
    if (button) setArticleOption("codeTheme", button.dataset.articleCodeTheme);
  });
  els.articleMacCode.addEventListener("change", () => setArticleOption("macCode", els.articleMacCode.checked));
  els.articleSizeList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-article-size]");
    if (button) setArticleOption("size", button.dataset.articleSize);
  });
  els.articleCssToggle.addEventListener("click", () => setArticleCssEditorOpen(els.articleCssPanel.hidden));

  els.content.addEventListener("input", () => {
    scheduleTextHistoryCommit();
    requestRender();
    hideSelectionToolbar();
  });
  els.content.addEventListener("keydown", handleTextShortcut);
  document.addEventListener("keydown", handlePreviewImageDeleteKey);
  els.content.addEventListener("paste", handleEditorPaste);
  els.content.addEventListener("dragover", (event) => {
    if (Array.from(event.dataTransfer?.types || []).includes("Files")) event.preventDefault();
  });
  els.content.addEventListener("drop", handleEditorDrop);

  [
    els.draftTitle,
    els.displayName,
    els.handle,
    els.textColor,
    els.accentColor,
    els.bgColor,
    els.bgPattern,
    els.fontSize,
    els.lineHeight,
    els.zhFont,
    els.enFont,
    els.imageHeight,
  ].forEach((input) => {
    input.addEventListener("input", requestRender);
    input.addEventListener("change", requestRender);
  });

  els.inlineColor.addEventListener("input", () => {
    updatePendingCustomColor("color", els.inlineColor.value);
  });
  els.inlineBgColor.addEventListener("input", () => {
    updatePendingCustomColor("bg", els.inlineBgColor.value);
  });
  els.inlineColor.addEventListener("change", () => updatePendingCustomColor("color", els.inlineColor.value));
  els.inlineBgColor.addEventListener("change", () => updatePendingCustomColor("bg", els.inlineBgColor.value));
  document.addEventListener("pointerdown", handleSelectionInteractionStart, true);
  document.addEventListener("touchstart", handleSelectionInteractionStart, { capture: true, passive: true });
  document.addEventListener("selectionchange", () => {
    if (document.activeElement === els.content) claimTextareaSelection();
    if (!textareaSelectionCanShowToolbar()) {
      hideSelectionToolbar();
      return;
    }
    scheduleSelectionToolbar();
  });
  els.content.addEventListener("focus", () => claimTextareaSelection());
  els.content.addEventListener("select", () => {
    claimTextareaSelection();
    rescheduleSelectionToolbar();
  });
  els.content.addEventListener("mouseup", () => {
    claimTextareaSelection();
    rescheduleSelectionToolbar();
  });
  els.content.addEventListener("touchend", finishTouchSelection, { passive: true });
  els.content.addEventListener("touchcancel", finishTouchSelection, { passive: true });
  els.content.addEventListener("contextmenu", () => {
    claimTextareaSelection({ touch: true });
    finishTouchSelection();
  });
  els.content.addEventListener("keyup", (event) => {
    const key = event.key || "";
    if (event.shiftKey || key.startsWith("Arrow") || key === "Home" || key === "End" || (event.metaKey || event.ctrlKey) && key.toLowerCase() === "a") {
      claimTextareaSelection();
      rescheduleSelectionToolbar();
    }
  });
  els.content.addEventListener("focusout", (event) => {
    if (event.relatedTarget && els.selectionToolbar.contains(event.relatedTarget)) return;
    if (Date.now() < touchSelectionGraceUntil || Date.now() < selectionToolbarInteractionUntil) {
      window.setTimeout(scheduleSelectionToolbar, 180);
      return;
    }
    textareaOwnsSelection = false;
    hideSelectionToolbar();
  });
  els.content.addEventListener("scroll", hideSelectionToolbar);
  els.selectionColorBtn?.addEventListener("mousedown", keepTextareaSelection);
  els.selectionBgColorBtn?.addEventListener("mousedown", keepTextareaSelection);
  els.selectionUnderlineBtn?.addEventListener("mousedown", keepTextareaSelection);
  document.querySelectorAll("[data-custom-color-toggle]").forEach((summary) => {
    summary.addEventListener("mousedown", keepTextareaSelection);
  });
  document.querySelectorAll(".selection-custom-color-disclosure").forEach((details) => {
    details.addEventListener("toggle", () => {
      if (!details.open || els.selectionToolbar?.hidden) return;
      window.requestAnimationFrame(showSelectionToolbar);
    });
  });
  document.querySelectorAll(".selection-toolbar [data-format]").forEach((button) => {
    button.addEventListener("mousedown", keepTextareaSelection);
    button.addEventListener("click", () => {
      wrapSelection(button.dataset.format);
      if (button.dataset.format?.startsWith("underline-")) setSelectionPalette(null, false);
    });
  });
  els.selectionColorBtn?.addEventListener("click", () => {
    setSelectionPalette("color", els.selectionColorPalette.hidden);
  });
  els.selectionBgColorBtn?.addEventListener("click", () => {
    setSelectionPalette("bg", els.selectionBgPalette.hidden);
  });
  els.selectionUnderlineBtn?.addEventListener("click", () => {
    setSelectionPalette("underline", els.selectionUnderlinePalette.hidden);
  });
  els.selectionSizeBtn?.addEventListener("mousedown", keepTextareaSelection);
  els.selectionSizeBtn?.addEventListener("click", () => {
    const open = els.selectionSizePalette.hidden;
    if (open) prefillInlineSizeInput(els.selectionSizePalette);
    setSelectionPalette("size", open);
  });
  els.sizeMenu?.addEventListener("toggle", () => {
    if (els.sizeMenu.open) prefillInlineSizeInput(els.sizeMenu);
  });
  // 编辑框上方的字号菜单与选区浮动工具栏共用同一套控件，按所在面板取输入框。
  const closeInlineSizePanels = () => {
    setSelectionPalette(null, false);
    if (els.sizeMenu) els.sizeMenu.open = false;
  };
  const inlineSizeInputFor = (control) => control.closest("[data-inline-size-panel]")?.querySelector("[data-inline-size-input]");
  document.querySelectorAll("[data-inline-size]").forEach((button) => {
    button.addEventListener("mousedown", keepTextareaSelection);
    button.addEventListener("click", () => {
      if (applyFontSizeToSelection(button.dataset.inlineSize)) closeInlineSizePanels();
    });
  });
  document.querySelectorAll("[data-inline-size-apply]").forEach((button) => {
    button.addEventListener("mousedown", keepTextareaSelection);
    button.addEventListener("click", () => {
      if (applyFontSizeToSelection(inlineSizeInputFor(button)?.value)) closeInlineSizePanels();
    });
  });
  document.querySelectorAll("[data-inline-size-input]").forEach((input) => {
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        if (applyFontSizeToSelection(input.value)) closeInlineSizePanels();
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeInlineSizePanels();
        els.content.focus({ preventScroll: true });
      }
    });
  });
  document.querySelectorAll("[data-clear-inline-size]").forEach((button) => {
    button.addEventListener("mousedown", keepTextareaSelection);
    button.addEventListener("click", () => {
      if (removeFontSizeFromSelection()) closeInlineSizePanels();
    });
  });
  els.selectionCustomColor?.addEventListener("input", () => {
    updatePendingCustomColor("color", els.selectionCustomColor.value);
  });
  els.selectionCustomColor?.addEventListener("change", () => {
    updatePendingCustomColor("color", els.selectionCustomColor.value);
  });
  els.selectionCustomBg?.addEventListener("input", () => {
    updatePendingCustomColor("bg", els.selectionCustomBg.value);
  });
  els.selectionCustomBg?.addEventListener("change", () => {
    updatePendingCustomColor("bg", els.selectionCustomBg.value);
  });
  document.querySelectorAll("[data-custom-color-action]").forEach((button) => {
    button.addEventListener("mousedown", keepTextareaSelection);
    button.addEventListener("click", () => {
      applyCustomColorChoice(button.dataset.colorKind, button.dataset.colorSave === "true");
    });
  });
  document.querySelectorAll("[data-clear-inline-style]").forEach((button) => {
    button.addEventListener("mousedown", keepTextareaSelection);
    button.addEventListener("click", () => {
      const kind = button.dataset.clearInlineStyle;
      if (!removeColorFromSelection(kind)) return;
      if (kind === "color") els.colorMenu.open = false;
      else els.bgColorMenu.open = false;
      setSelectionPalette(null, false);
    });
  });
  buildSelectionSwatches("color");
  buildSelectionSwatches("bg");
  els.bgThemeMenu?.addEventListener("toggle", () => {
    if (els.bgThemeMenu.open) buildBgThemeGrid();
  });
  els.bgThemeGrid?.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-bg-theme]");
    if (button) applyBgTheme(button.dataset.bgTheme);
  });
  els.contentImage.addEventListener("change", handleContentImage);
  els.copyPlainText?.addEventListener("click", () => void copyPlainTextToClipboard());
  els.clearInlineStyles?.addEventListener("click", () => void clearAllInlineStyles());
  els.emojiMenu?.addEventListener("toggle", () => {
    if (els.emojiMenu.open) buildEmojiGrid();
  });
  els.contentVideo.addEventListener("change", handleLivePhotoVideo);
  els.connectObsidianVault?.addEventListener("click", connectObsidianVault);
  els.syncObsidianVault?.addEventListener("click", syncCurrentNoteToObsidian);
  els.obsidianVaultFolder?.addEventListener("change", handleObsidianVaultFolder);
  els.applyImageWidth?.addEventListener("click", applyImageWidthToAll);
  els.applyFixedImageSize?.addEventListener("click", applyFixedImageSizeToAll);
  els.avatarInput.addEventListener("change", handleAvatar);
  els.cropAvatar.addEventListener("click", () => openCropper("avatar"));
  els.cropClose.addEventListener("click", closeCropper);
  els.cropApply.addEventListener("click", applyCropper);
  els.cropReset.addEventListener("click", resetCropperTarget);
  els.cropModal.addEventListener("click", (event) => {
    if (event.target === els.cropModal) closeCropper();
  });
  els.pairClose?.addEventListener("click", cancelPairEditor);
  els.pairDone?.addEventListener("click", commitPairEditor);
  els.pairDropLeft?.addEventListener("click", () => removePairImage("left"));
  els.pairDropRight?.addEventListener("click", () => removePairImage("right"));
  els.pairSwap?.addEventListener("click", swapPairImages);
  els.pairCropLeft?.addEventListener("click", () => void openCropper("image", pairEditor.leftId));
  els.pairCropRight?.addEventListener("click", () => void openCropper("image", pairEditor.rightId));
  els.pairRatioButtons.forEach((button) => {
    button.addEventListener("click", () => setPairRatio(button.dataset.pairRatio));
  });
  els.pairModal?.addEventListener("click", (event) => {
    if (event.target === els.pairModal) cancelPairEditor();
  });
  els.wechatModal.addEventListener("click", (event) => {
    if (event.target === els.wechatModal) closeWechatModal();
  });
  els.livePhotoModal.addEventListener("click", (event) => {
    if (event.target === els.livePhotoModal) closeLivePhotoModal();
  });
  els.accountModal.addEventListener("click", (event) => {
    if (event.target === els.accountModal) closeAccountModal();
  });
  els.feedbackModal?.addEventListener("click", (event) => {
    if (event.target === els.feedbackModal) closeFeedbackModal();
  });
  els.welcomeBackModal?.addEventListener("click", (event) => {
    if (event.target === els.welcomeBackModal) closeWelcomeBack();
  });
  els.livePhotoHandoffModal.addEventListener("click", (event) => {
    if (event.target === els.livePhotoHandoffModal) closeLivePhotoHandoff();
  });
  els.wechatClose.addEventListener("click", closeWechatModal);
  els.wechatCancel.addEventListener("click", closeWechatModal);
  els.wechatTitle.addEventListener("input", updateWechatConfirmState);
  els.wechatCover.addEventListener("change", handleWechatCover);
  els.wechatConfirm.addEventListener("click", syncArticleToWechatDraft);
  els.livePhotoClose.addEventListener("click", closeLivePhotoModal);
  els.livePhotoCancel.addEventListener("click", closeLivePhotoModal);
  els.livePhotoHandoffClose.addEventListener("click", closeLivePhotoHandoff);
  els.livePhotoHandoffCancel.addEventListener("click", closeLivePhotoHandoff);
  els.livePhotoHandoffReveal.addEventListener("click", revealLivePhotoHandoff);
  els.livePhotoHandoffAirdrop.addEventListener("click", airdropLivePhotoHandoff);
  els.livePhotoHandoffDownload.addEventListener("click", downloadLivePhotoBatch);
  els.onboardingSkip.addEventListener("click", finishOnboarding);
  els.onboardingNext.addEventListener("click", advanceOnboarding);
  els.welcomeBackClose?.addEventListener("click", () => closeWelcomeBack());
  els.welcomeBackDirect?.addEventListener("click", () => closeWelcomeBack());
  els.welcomeBackTour?.addEventListener("click", () => closeWelcomeBack({ startTour: true }));
  els.account.addEventListener("click", toggleAccountMenu);
  els.feedback?.addEventListener("click", openFeedbackModal);
  els.feedbackClose?.addEventListener("click", closeFeedbackModal);
  els.feedbackCancel?.addEventListener("click", closeFeedbackModal);
  els.feedbackForm?.addEventListener("submit", submitFeedback);
  els.feedbackMessage?.addEventListener("input", handleFeedbackFieldInput);
  els.feedbackContact?.addEventListener("input", handleFeedbackFieldInput);
  els.feedbackImageInput?.addEventListener("change", (event) => addFeedbackFiles(event.target.files));
  els.feedbackUploadDropzone?.addEventListener("dragenter", (event) => {
    event.preventDefault();
    els.feedbackUploadDropzone.classList.add("is-dragging");
  });
  els.feedbackUploadDropzone?.addEventListener("dragover", (event) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  });
  els.feedbackUploadDropzone?.addEventListener("dragleave", (event) => {
    if (!els.feedbackUploadDropzone.contains(event.relatedTarget)) {
      els.feedbackUploadDropzone.classList.remove("is-dragging");
    }
  });
  els.feedbackUploadDropzone?.addEventListener("drop", (event) => {
    event.preventDefault();
    els.feedbackUploadDropzone.classList.remove("is-dragging");
    addFeedbackFiles(event.dataTransfer?.files);
  });
  els.accountMenuLogin?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openAccountModal();
  });
  els.accountMenuManage?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openAccountModal();
  });
  els.accountMenuSwitch?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openAccountModal();
  });
  els.accountMenuAdd?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    startAddingAccount();
  });
  els.accountMenuSignOut?.addEventListener("click", signOutAccount);
  els.accountMenuWhatsNew?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeAccountMenu();
    startWhatsNewTour();
  });
  els.portableExport?.addEventListener("click", () => void runPortableAction(els.portableExport, exportPortableProject));
  els.saveToProject?.addEventListener("click", () => void runPortableAction(els.saveToProject, saveProjectToFolderDrafts));
  els.portableImportOpen?.addEventListener("click", openPortableImportModal);
  els.portableImportClose?.addEventListener("click", closePortableImportModal);
  els.portableImportModal?.addEventListener("click", (event) => {
    if (event.target === els.portableImportModal) closePortableImportModal();
  });
  els.portableImportZip?.addEventListener("click", () => els.portableImportZipInput.click());
  els.portableImportZipInput?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void previewPortableImport(() => inspectPortableZip(file), file.name, true);
  });
  els.portableImportMarkdown?.addEventListener("click", () => els.portableImportMarkdownInput.click());
  els.portableImportMarkdownInput?.addEventListener("change", (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length) void previewPortableImport(() => inspectMarkdownImport(files), files.find(isMarkdownFile)?.name || "Markdown");
  });
  els.portableImportFolder.hidden = true;
  els.portableImportFolder?.addEventListener("click", () => els.portableImportFolderInput.click());
  els.portableImportFolderInput?.addEventListener("change", (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length) void previewPortableImport(() => inspectPortableFolder(files), files[0].webkitRelativePath.split("/")[0]);
  });
  els.portableImportChoiceSelect?.addEventListener("change", (event) => {
    selectPortableImportOption(Number(event.target.value));
  });
  els.portableImportDropzone?.addEventListener("dragover", (event) => {
    event.preventDefault();
    els.portableImportDropzone.classList.add("is-dragging");
  });
  els.portableImportDropzone?.addEventListener("dragleave", () => els.portableImportDropzone.classList.remove("is-dragging"));
  els.portableImportDropzone?.addEventListener("drop", (event) => void handlePortableImportDrop(event));
  els.portableImportConfirm?.addEventListener("click", () => void confirmPortableImport());
  els.cloudMigration?.addEventListener("click", openCloudMigrationModal);
  els.migrationTestOpen?.addEventListener("click", openMigrationTestLogin);
  els.migrationTestSignOut?.addEventListener("click", () => void signOutMigrationTest());
  els.migrationTestClose?.addEventListener("click", closeMigrationTestLogin);
  els.migrationTestModal?.addEventListener("click", (event) => {
    if (event.target === els.migrationTestModal) closeMigrationTestLogin();
  });
  els.migrationTestEmailForm?.addEventListener("submit", (event) => void signInMigrationTestWithEmail(event));
  els.migrationTestSignInMode?.addEventListener("click", () => setMigrationTestAuthMode("signin"));
  els.migrationTestSignUpMode?.addEventListener("click", () => setMigrationTestAuthMode("signup"));
  els.migrationTestGoogle?.addEventListener("click", () => void signInMigrationTestWithGoogle());
  els.cloudMigrationClose?.addEventListener("click", closeCloudMigrationModal);
  els.cloudMigrationRefresh?.addEventListener("click", () => void refreshCloudMigrationList());
  els.cloudMigrationAll?.addEventListener("click", () => void migrateAllCloudProjects());
  els.cloudMigrationBrowserDownload?.addEventListener("click", () => void migrateAllCloudProjects({ browserDownload: true }));

  els.cloudMigrationModal?.addEventListener("click", (event) => {
    if (event.target === els.cloudMigrationModal) closeCloudMigrationModal();
  });
  els.cloudMigrationList?.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-cloud-project-id]");
    if (!button || cloudState.migrationBusy) return;
    const project = cloudState.legacyProjects.find((item) => item.id === button.dataset.cloudProjectId);
    if (!project) return;
    setMigrationBusy(true);
    try {
      await runPortableAction(button, async () => {
        els.cloudMigrationStatus.textContent = `正在整理：${project.title}`;
        try {
          await exportPortableProject(project);
          els.cloudMigrationStatus.textContent = `${projectFolderName(project)}.zip 已交给浏览器下载；请在下载目录核对。`;
        } catch (error) {
          els.cloudMigrationStatus.textContent = error?.message || "旧稿下载失败。";
          throw error;
        }
      });
    } finally {
      setMigrationBusy(false);
    }
  });
  els.maintenanceWelcomeStart?.addEventListener("click", () => {
    finishMaintenanceWelcome();
    void chooseGuestMode();
  });
  els.maintenanceWelcomeMigrate?.addEventListener("click", () => {
    finishMaintenanceWelcome();
    openMigrationTestLogin();
  });
  els.maintenanceWelcomeAccount?.addEventListener("click", () => {
    finishMaintenanceWelcome();
    chooseLoginMode();
  });
  els.entryChoiceMigration?.addEventListener("click", openMigrationTestLogin);
  els.chooseGuest?.addEventListener("click", () => void chooseGuestMode());
  els.chooseLogin?.addEventListener("click", chooseLoginMode);
  els.accountClose.addEventListener("click", closeAccountModal);
  els.accountGuestFallback?.addEventListener("click", async () => {
    accountAuthAddMode = false;
    els.accountModal.classList.add("hidden");
    await chooseGuestMode();
  });
  els.accountAuthForm.addEventListener("submit", submitAccountAuth);
  els.accountSignInMode.addEventListener("click", () => setAccountAuthMode("signin"));
  els.accountSignUp.addEventListener("click", () => setAccountAuthMode("signup"));
  els.accountPasswordToggle?.addEventListener("click", () => {
    setAccountPasswordVisible(els.accountPassword.type === "password");
    els.accountPassword.focus();
  });
  els.accountResendConfirmation.addEventListener("click", resendAccountConfirmation);
  els.accountForgotPassword?.addEventListener("click", () => void requestPasswordReset());
  els.accountGoogle?.addEventListener("click", () => void signInWithGoogleAccount());
  els.accountSignOut.addEventListener("click", signOutAccount);
  els.accountAddAnother?.addEventListener("click", () => startAddingAccount());
  els.accountImportLocal.addEventListener("click", importLocalProjectsToAccount);
  document.addEventListener("pointerdown", (event) => {
    if (accountMenuIsOpen() && !els.accountDock?.contains(event.target)) closeAccountMenu();
    if (els.downloadMenu?.open && !els.downloadMenu.contains(event.target)) els.downloadMenu.open = false;
  });
  window.addEventListener("pageshow", (event) => {
    // 从 Google 页面点返回时，Safari/Chrome 可能恢复原页而不重新执行初始化。
    if (event.persisted) restoreCancelledGoogleOAuth();
  });
  window.addEventListener("resize", positionOnboardingStep);
  window.addEventListener("scroll", positionOnboardingStep, true);
  els.livePhotoForm.addEventListener("submit", applyLivePhotoAsset);
  els.livePhotoVideoInput.addEventListener("change", handleLivePhotoVideo);
  els.livePhotoVideo.addEventListener("loadedmetadata", handleLivePhotoMetadata);
  els.livePhotoVideo.addEventListener("timeupdate", keepLivePhotoPreviewInRange);
  els.livePhotoVideo.addEventListener("play", animateLivePhotoCropper);
  els.livePhotoVideo.addEventListener("seeked", drawLivePhotoCropper);
  els.livePhotoCropCanvas.addEventListener("pointerdown", startLivePhotoCropDrag);
  els.livePhotoCropCanvas.addEventListener("pointermove", moveLivePhotoCropDrag);
  els.livePhotoCropCanvas.addEventListener("pointermove", updateLivePhotoCropCursor);
  els.livePhotoCropCanvas.addEventListener("pointerup", stopLivePhotoCropDrag);
  els.livePhotoCropCanvas.addEventListener("pointercancel", stopLivePhotoCropDrag);
  els.livePhotoDurationButtons.forEach((button) => {
    button.addEventListener("click", () => setLivePhotoDuration(button.dataset.liveDuration));
  });
  els.livePhotoSpeedButtons.forEach((button) => {
    button.addEventListener("click", () => setLivePhotoSpeed(button.dataset.liveSpeed));
  });
  els.livePhotoRatioButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setLivePhotoAspect(button.dataset.liveRatio);
      updateLivePhotoPreview();
    });
  });
  els.livePhotoCustomRatio.addEventListener("input", () => {
    livePhotoState.customAspect = clamp(finiteNumber(els.livePhotoCustomRatio.value, 0.75), 0.4, 2.5);
    els.livePhotoCustomRatioOutput.value = livePhotoState.customAspect.toFixed(2);
    if (livePhotoState.aspect === "free") {
      // 拖滑杆是明确要求按这个比例重排选区，所以这里才允许覆盖当前框。
      setLivePhotoAspect("free", { applyCustomRatio: true });
      updateLivePhotoPreview();
    }
  });
  bindLivePhotoTrimTrack();
  els.livePhotoCover.addEventListener("input", () => seekLivePhotoPreview(true));
  els.livePhotoSound?.addEventListener("change", applyLivePhotoPreviewSound);
  els.ratioButtons.forEach((button) => {
    button.addEventListener("click", () => setCropAspect(button.dataset.ratio));
  });
  els.cropCanvas.addEventListener("mousedown", startCropDrag);
  window.addEventListener("mousemove", moveCropDrag);
  window.addEventListener("mouseup", stopCropDrag);
  window.addEventListener("keydown", (event) => {
    if (feedbackModalIsOpen()) {
      if (event.key === "Escape") closeFeedbackModal();
      else if (event.key === "Tab") trapModalFocus(event, els.feedbackModal);
      return;
    }
    if (!els.portableImportModal.classList.contains("hidden")) {
      if (event.key === "Escape") closePortableImportModal();
      else if (event.key === "Tab") trapModalFocus(event, els.portableImportModal);
      return;
    }
    if (event.key === "Escape" && !els.cropModal.classList.contains("hidden")) closeCropper();
    else if (event.key === "Escape" && pairModalIsOpen()) cancelPairEditor();
    if (event.key === "Escape" && !els.wechatModal.classList.contains("hidden")) closeWechatModal();
    if (event.key === "Escape" && !els.livePhotoModal.classList.contains("hidden")) closeLivePhotoModal();
    if (event.key === "Escape" && !els.livePhotoHandoffModal.classList.contains("hidden")) closeLivePhotoHandoff();
    if (event.key === "Escape" && !els.accountModal.classList.contains("hidden")) closeAccountModal();
    if (event.key === "Escape" && !els.migrationTestModal.classList.contains("hidden")) closeMigrationTestLogin();
    if (event.key === "Escape" && !els.cloudMigrationModal.classList.contains("hidden")) closeCloudMigrationModal();
    if (event.key === "Escape" && welcomeBackIsOpen()) closeWelcomeBack();
    if (event.key === "Escape" && accountMenuIsOpen()) closeAccountMenu();
    if (event.key === "Escape") {
      document.querySelectorAll(".tool-menu[open]").forEach((menu) => {
        menu.open = false;
      });
      hideSelectionToolbar();
    }
    if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "f") {
      const target = event.target;
      const insideEditor = target === document.body || target.closest?.(".editor-panel, .tool-menu");
      if (insideEditor) {
        event.preventDefault();
        els.searchMenu.open = true;
        document.querySelectorAll(".tool-menu").forEach((other) => {
          if (other !== els.searchMenu) other.open = false;
        });
        requestAnimationFrame(() => {
          positionToolPopover(els.searchMenu);
          els.find.focus();
          els.find.select();
        });
      }
    }
  });
  els.findNext.addEventListener("click", findNext);
  els.replaceOne.addEventListener("click", replaceCurrent);
  els.replaceAll.addEventListener("click", replaceAll);
  els.find.addEventListener("input", updateFindMatchCount);
  els.find.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    findNext();
  });
  els.replace.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (event.metaKey || event.ctrlKey) {
      replaceAll();
    } else {
      replaceCurrent();
    }
  });
  els.searchMenu?.addEventListener("toggle", () => {
    if (!els.searchMenu.open) return;
    requestAnimationFrame(() => {
      els.find.focus();
      if (els.find.value) els.find.select();
      updateFindMatchCount();
    });
  });
  els.historyToggle.addEventListener("click", toggleHistory);
  els.historyClose.addEventListener("click", () => setHistoryOpen(false));
  els.syncFolderDrafts.addEventListener("click", () => syncFolderDrafts({ announce: true }));
  els.historyFilterButtons.forEach((button) => {
    button.addEventListener("click", () => setHistoryFilter(button.dataset.historyFilter));
  });
  els.newProject.addEventListener("click", async () => {
    await createNewProject();
    if (onboardingMode === "first-run" && onboardingIsOpen() && onboardingStepIndex === 0) showOnboardingStep(1);
  });
  els.convertMode.addEventListener("click", convertCurrentMode);
  els.headerModeToggle.addEventListener("click", toggleHeaderMode);
  els.themeToggle.addEventListener("click", toggleUiTheme);
  els.downloadZip.addEventListener("click", () => {
    els.downloadMenu.open = false;
    void downloadAll();
  });
  els.downloadArticle.addEventListener("click", () => {
    els.downloadMenu.open = false;
    void downloadArticleImage();
  });
  els.downloadPdf.addEventListener("click", () => {
    els.downloadMenu.open = false;
    void downloadPdf();
  });
  els.copyWechat.addEventListener("click", copyArticleToWechat);
  els.copyFeishu.addEventListener("click", copyArticleToFeishu);
  els.syncWechat.addEventListener("click", openWechatModal);
}

if (cloudApi()?.configured) document.body.classList.add("cloud-session-checking");
loadPanelLayout();
applyPanelLayout();
const initialFormState = loadState();
applyForm(initialFormState);
syncGuideReadOnlyMode();
resetTextHistory();
updateProjectHistory();
bindEvents();
void syncFolderDrafts();
void loadObsidianVaultConnection();
void initializeCloudAccount();
if (window.lucide) {
  window.lucide.createIcons();
}

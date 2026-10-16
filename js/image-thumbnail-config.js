// キャスト画像サムネイルの生成仕様(PC版・スマホ版・scripts/regenerate-thumbnails.mjs の共通値)。
// 値を変えたら、既存サムネイルの作り直し(npm run thumbnails:regenerate)も必要。
export const THUMBNAIL_MAX_LONG_EDGE = 840;
export const THUMBNAIL_MIN_LONG_EDGE = 120;
export const THUMBNAIL_TARGET_SIZE = 120 * 1024;
export const THUMBNAIL_MAX_OUTPUT_FILE_SIZE = 200 * 1024;
export const THUMBNAIL_QUALITY_STEPS = [0.82, 0.74, 0.66, 0.58, 0.5, 0.42];
export const THUMBNAIL_SHRINK_STEP = 0.86;

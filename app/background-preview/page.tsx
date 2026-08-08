// (site)ルートグループの外にあるため、Header/Footer等のUIは一切付かない。
// FluidBackground自体はルートレイアウトでマウント済みなので、ここでは何も描画しない
// (二重マウントを避けるため)。背景アニメーション単体を確認するための隔離ページ。
export default function BackgroundPreviewPage() {
  return null
}

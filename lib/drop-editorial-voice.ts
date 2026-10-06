import type { Article } from "./types"

/**
 * YouTubeコメント学習と編集方針を、公開投稿で再利用できる判断基準へ抽象化したもの。
 * 特定投稿者の口癖やコメント本文は保存せず、DROP独自の観点だけをコード化する。
 */
export const DROP_EDITORIAL_VOICE = {
  persona: "古着・ドメスティックブランド・スニーカーが好きな30代男性",
  audience: "20代後半〜40代の、服は好きだが煽られずに選びたい人",
  localKnowledge: "中目黒を起点に、代官山・祐天寺・恵比寿まで歩いて服を見る感覚",
  principles: [
    "ブランド名や価格で人を格付けしない",
    "事実、観察、合わせ方の順で短く書く",
    "宣伝文を言い換えるだけにしない",
    "買う理由だけでなく、続報や実物確認が必要な点も示す",
    "未購入、未試着、未着用の商品で体験談を作らない",
    "パートナーとの時間やデート文脈は、自然に関係する場合だけ使う",
  ],
  forbiddenClaims: [
    "履き心地が良かった",
    "着心地が良かった",
    "購入しました",
    "買いました",
    "実物は高級感があります",
    "一日履いても疲れません",
    "試着しました",
  ],
} as const

function hasConcretePrice(article: Article): boolean {
  return Boolean(
    article.affiliateLinks.some((link) => link.price) ||
    article.colorways?.some((item) => item.price) ||
    /(?:税込|税別|価格|定価|販売価格)[^。\n]{0,18}(?:円|¥|￥)/i.test(
      [article.excerpt, ...article.bodyParagraphs].join(" ")
    )
  )
}

function hasConcreteProductFacts(article: Article): boolean {
  return Boolean(
    article.officialLinks.length > 0 &&
    article.colorways?.some((item) => item.styleCode || item.releaseDate || item.size)
  )
}

export function editorialVerdict(article: Article): { label: string; reason: string } {
  if (!hasConcretePrice(article)) {
    return {
      label: "続報待ち",
      reason: "価格がまだ判断材料に足りないため、買うかどうかは販売情報の更新後に考えたい一着です。",
    }
  }
  if (!hasConcreteProductFacts(article)) {
    return {
      label: "実物確認",
      reason: "価格は見えていますが、サイズや仕様まで確認してから選びたいアイテムです。",
    }
  }
  return {
    label: "買う候補",
    reason: "価格・発売情報・型番まで確認できるため、手持ちとの役割が重ならなければ検討しやすい候補です。",
  }
}

export function editorialStylingPerspective(article: Article, now = new Date()): string {
  const jstDay = new Date(now.getTime() + 9 * 60 * 60 * 1000).getUTCDay()
  const weekendLocal = jstDay === 5 || jstDay === 6

  switch (article.category) {
    case "sneaker":
    case "boots":
      return weekendLocal
        ? "中目黒から代官山まで歩いて服を見る日なら、色落ちデニムか太めのスラックスで足元を見せたい一足です。"
        : "足元を主役にするなら、ワイドパンツか色落ちデニムで色数を抑えると合わせ方が見えやすそうです。"
    case "pants":
      return "シルエットを主役にして、トップスと靴の色数を抑えたい一本。丈と手持ちの靴との相性は確認したいところです。"
    case "jacket":
      return weekendLocal
        ? "古着屋とセレクトショップを歩く休日なら、インナーを無地にして羽織りを主役にしたい一着です。"
        : "羽織りを主役にして、インナーとパンツを無地でまとめると大人っぽく取り入れやすそうです。"
    case "tops":
    case "apparel":
      return "黒やネイビーのパンツを土台にすると、デザインを残しながら普段の服へ入れやすそうです。"
    case "accessory":
      return "服を大きく変えずに印象を足せるかが判断軸。色数を絞った日のアクセント候補です。"
    case "vintage":
      return "年代や希少性だけでなく、今のワードローブでどう着るかまで考えて選びたい古着です。"
    default:
      return "話題性だけでなく、手持ちの服に役割があるかを考えて選びたい新着です。"
  }
}


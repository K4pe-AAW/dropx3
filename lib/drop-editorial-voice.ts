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

export function pickEditorialLine(seed: string, lines: readonly string[]): string {
  let hash = 0
  for (const char of seed) hash = (Math.imul(hash, 31) + (char.codePointAt(0) ?? 0)) >>> 0
  return lines[hash % lines.length] ?? lines[0] ?? ""
}

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
      reason: pickEditorialLine(article.id, [
        "まだ価格が見えないので、今は雰囲気だけで決めずに続報を待ちたいです。",
        "気になる見た目ですが、価格が出るまではいったん保留。ここで無理に推す段階ではなさそうです。",
        "まず知りたいのは価格。そこが分かってから、手持ちと比べて考えたいところです。",
      ]),
    }
  }
  if (!hasConcreteProductFacts(article)) {
    return {
      label: "実物確認",
      reason: pickEditorialLine(`${article.id}:facts`, [
        "価格は見えています。あとはサイズや仕様を見て、手持ちに本当に必要か決めたいです。",
        "値段だけなら検討圏内。ただ、サイズ感と細かな仕様が分かるまでは即決しにくいです。",
        "気になるけれど、まだ材料不足。サイズと仕様を確認してからが本番です。",
      ]),
    }
  }
  return {
    label: "買う候補",
    reason: pickEditorialLine(`${article.id}:buy`, [
      "価格も発売情報も確認できました。手持ちと役割がかぶらないなら、かなり考えやすい候補です。",
      "必要な情報はひと通り揃っています。あとは似た服を持っていないか、クローゼットを見て決めたいです。",
      "型番まで追えるので検討しやすいです。勢いで買うより、手持ちにない役割なら候補に入れたい。",
    ]),
  }
}

export function editorialStylingPerspective(article: Article, now = new Date()): string {
  const jstDay = new Date(now.getTime() + 9 * 60 * 60 * 1000).getUTCDay()
  const weekendLocal = jstDay === 5 || jstDay === 6

  switch (article.category) {
    case "sneaker":
    case "boots":
      return weekendLocal
        ? pickEditorialLine(`${article.id}:weekend-shoes`, [
          "中目黒から代官山まで歩く日なら、色落ちデニムで少し力を抜いて履きたいです。",
          "中目黒で服を見る休日なら、太めのスラックスから足元だけしっかり見せる合わせが気になります。",
        ])
        : pickEditorialLine(`${article.id}:weekday-shoes`, [
          "足元を主役にするなら、ワイドパンツで色数を絞るのがよさそうです。",
          "色落ちデニムに合わせるくらいが自然。服まで盛りすぎない方が、この靴は生きそうです。",
          "黒のスラックスで少しきれいに寄せるか、デニムで崩すか。どちらも試しやすそうです。",
        ])
    case "pants":
      return pickEditorialLine(`${article.id}:pants`, [
        "パンツの形を見せたいので、トップスと靴は色を増やしすぎない方がよさそう。丈だけは手持ちの靴と確認したいです。",
        "主役はこのシルエット。上は無地でまとめて、裾がどの靴に乗るかを見て選びたいです。",
      ])
    case "jacket":
      return weekendLocal
        ? "古着屋とセレクトショップを歩く休日なら、インナーは無地にして、この羽織りだけ目立たせたいです。"
        : pickEditorialLine(`${article.id}:jacket`, [
          "インナーとパンツを無地でまとめれば、頑張りすぎず大人っぽく取り入れやすそうです。",
          "羽織りが十分強いので、ほかは静かに。黒パンツくらいでちょうどよさそうです。",
          "合わせるなら、まずは白Tと濃色パンツ。難しく考えず、そのくらいから試したいです。",
        ])
    case "tops":
    case "apparel":
      return pickEditorialLine(`${article.id}:tops`, [
        "黒かネイビーのパンツを土台にすると、デザインを残しながら普段の服へ入れやすそうです。",
        "まずはいつもの濃色パンツで十分。トップスの良さを消さない合わせがよさそうです。",
      ])
    case "accessory":
      return "服を大きく変えずに印象を足せるかが判断軸。色数を絞った日のアクセント候補です。"
    case "vintage":
      return "年代や希少性だけでなく、今のワードローブでどう着るかまで考えて選びたい古着です。"
    default:
      return "話題性だけでなく、手持ちの服に役割があるかを考えて選びたい新着です。"
  }
}

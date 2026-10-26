import { canonicalBrandName } from "./brands"

export type BrandHubProfile = {
  name: string
  officialUrl: string
  summary: string
  focus: string[]
}

/**
 * 薄いブランド一覧を量産せず、継続収集と編集方針が揃っている重点ブランドだけを
 * 常設ハブとして扱う。説明は時期で変わるコレクション情報を断定せず、DROPが追う
 * 観点に限定する。
 */
export const BRAND_HUBS: BrandHubProfile[] = [
  {
    name: "A.PRESSE",
    officialUrl: "https://ec.apresse.jp/",
    summary: "ヴィンテージやアーカイブの背景を現代のバランスで捉えるA.PRESSE。DROPでは新作、発売日、価格、公式販売情報を継続して整理します。",
    focus: ["新作デリバリー", "素材・ディテール", "発売日・価格"],
  },
  {
    name: "COMOLI",
    officialUrl: "https://www.comoli.jp/",
    summary: "日常着を軸に独自の素材とシルエットを提案するCOMOLI。公式発表を優先し、シーズンの新作と販売情報を追います。",
    focus: ["シーズン新作", "素材・シルエット", "公式販売情報"],
  },
  {
    name: "AURALEE",
    officialUrl: "https://auralee.jp/",
    summary: "素材開発と端正な色、シルエットで知られるAURALEE。新作の仕様、価格、発売情報を一次情報から確認してまとめます。",
    focus: ["素材・色", "メンズ新作", "発売日・価格"],
  },
  {
    name: "Graphpaper",
    officialUrl: "https://graphpaper-tokyo.com/",
    summary: "現代の生活に馴染む機能とシルエットを提案するGraphpaper。定番の更新からコラボ、新作デリバリーまで追います。",
    focus: ["新作デリバリー", "定番の更新", "コラボ"],
  },
  {
    name: "NICENESS",
    officialUrl: "https://www.niceness.jp/",
    summary: "服飾史の要素とものづくりを現代のプロダクトへ落とし込むNICENESS。新作の背景と具体的な販売情報を整理します。",
    focus: ["新作プロダクト", "背景・ディテール", "販売情報"],
  },
  {
    name: "YOKE",
    officialUrl: "https://yoketokyo.com/",
    summary: "素材やパターンを通して人と服のつながりを提案するYOKE。公式発表を優先し、新作デリバリー、仕様、発売情報を継続して整理します。",
    focus: ["新作デリバリー", "素材・パターン", "発売情報"],
  },
]

const BRAND_HUB_MAP = new Map(BRAND_HUBS.map((profile) => [profile.name.toLowerCase(), profile]))

export function getBrandHubProfile(raw: string): BrandHubProfile | undefined {
  return BRAND_HUB_MAP.get(canonicalBrandName(raw).toLowerCase())
}

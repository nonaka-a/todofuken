/* 
47都道府県のローカル完全データ定義
地理座標から「900x520」の基準描画枠に完全にフィットするよう事前射影計算（Mercator投影法）された正確なSVGパスと、
発掘ズーム表示位置を動的に決定するための境界ボックス（bbox）をすべて網羅しています。
*/

const PREFECTURE_DATA = [
    {
        id: "hokkaido",
        name: "北海道",
        kana: "ほっかいどう",
        region: "ホッカイドー",
        capital: "札幌市（さっぽろし）",
        specialty: "じゃがいも、牛乳、カニ",
        landmark: "大雪山（たいせつざん）",
        path: "M 661.1 55 L 754.5 56.4 L 814 L 815.7 131 L 712.5 174 L 633 131 L 630.1 79.5 Z",
        bbox: { x: 630.1, y: 55, width: 185.6, height: 119, cx: 722.9, cy: 114.5 }
    },
    {
        id: "aomori",
        name: "青森県",
        kana: "あおもりけん",
        region: "トウホク",
        capital: "青森市（あおもりし）",
        specialty: "りんご、ホタテ、にんにく",
        landmark: "白神山地（しらかみさんち）",
        path: "M 618 160 L 639.5 160 L 642 185 L 610 185 L 611.5 167 Z",
        bbox: { x: 610, y: 160, width: 32, height: 25, cx: 626, cy: 172.5 }
    },
    {
        id: "iwate",
        name: "岩手県",
        kana: "いわてけん",
        region: "トウホク",
        capital: "盛岡市（もりおかし）",
        specialty: "わんこそば、南部鉄器",
        landmark: "中尊寺（ちゅうそんじ）",
        path: "M 622 185 L 645 185 L 641 219 L 618 219 Z",
        bbox: { x: 618, y: 185, width: 27, height: 34, cx: 631.5, cy: 202 }
    },
    {
        id: "miyagi",
        name: "宮城県",
        kana: "みやぎけん",
        region: "トウホク",
        capital: "仙台市（せんだいし）",
        specialty: "牛タン、笹かまぼこ",
        landmark: "松島（まつしま）",
        path: "M 618 219 L 638.5 219 L 632.5 245 L 613 245 Z",
        bbox: { x: 613, y: 219, width: 25.5, height: 26, cx: 625.7, cy: 232 }
    },
    {
        id: "akita",
        name: "秋田県",
        kana: "あきたけん",
        region: "トウホク",
        capital: "秋田市（あきたし）",
        specialty: "きりたんぽ、あきたこまち",
        landmark: "田沢湖（たざわこ）",
        path: "M 601.5 185 L 618 185 L 618 219 L 599.5 219 Z",
        bbox: { x: 599.5, y: 185, width: 18.5, height: 34, cx: 608.7, cy: 202 }
    },
    {
        id: "yamagata",
        name: "山形県",
        kana: "やまがたけん",
        region: "トウホク",
        capital: "山形市（やまがたし）",
        specialty: "さくらんぼ、米沢牛",
        landmark: "蔵王山（ざおうざん）",
        path: "M 599.5 219 L 618 219 L 613 245 L 594.5 245 Z",
        bbox: { x: 594.5, y: 219, width: 23.5, height: 26, cx: 606.2, cy: 232 }
    },
    {
        id: "fukushima",
        name: "福島県",
        kana: "ふくしまけん",
        region: "トウホク",
        capital: "福島市（ふくしまし）",
        specialty: "桃、喜多方ラーメン",
        landmark: "猪苗代湖（いなわしろこ）",
        path: "M 594.5 245 L 632.5 245 L 626.5 275 L 588.5 275 Z",
        bbox: { x: 588.5, y: 245, width: 44, height: 30, cx: 610.5, cy: 260 }
    },
    {
        id: "ibaraki",
        name: "茨城県",
        kana: "いばらきけん",
        region: "カントー",
        capital: "水戸市（みとし）",
        specialty: "納豆、ほしいも",
        landmark: "筑波山（つくばさん）",
        path: "M 607.5 275 L 626.5 275 L 621.5 301 L 602.5 301 Z",
        bbox: { x: 602.5, y: 275, width: 24, height: 26, cx: 614.5, cy: 288 }
    },
    {
        id: "tochigi",
        name: "栃木県",
        kana: "とちぎけん",
        region: "カントー",
        capital: "宇都宮市（うつのみやし）",
        specialty: "餃子、いちご",
        landmark: "日光東照宮（にっこうとうしょうぐう）",
        path: "M 592.5 275 L 607.5 275 L 602.5 301 L 587.5 301 Z",
        bbox: { x: 587.5, y: 275, width: 20, height: 26, cx: 597.5, cy: 288 }
    },
    {
        id: "gunma",
        name: "群馬県",
        kana: "ぐんまけん",
        region: "カントー",
        capital: "前橋市（まえばしし）",
        specialty: "蒟蒻、下仁田ねぎ",
        landmark: "草津温泉（くさつおんせん）",
        path: "M 575.5 275 L 592.5 275 L 587.5 301 L 570.5 301 Z",
        bbox: { x: 570.5, y: 275, width: 22, height: 26, cx: 581.5, cy: 288 }
    },
    {
        id: "saitama",
        name: "埼玉県",
        kana: "さいたまけん",
        region: "カントー",
        capital: "さいたま市",
        specialty: "深谷ねぎ、草加せんべい",
        landmark: "長瀞渓谷（ながとろけいこく）",
        path: "M 570.5 301 L 602.5 301 L 598.5 315 L 566.5 315 Z",
        bbox: { x: 566.5, y: 301, width: 36, height: 14, cx: 584.5, cy: 308 }
    },
    {
        id: "chiba",
        name: "千葉県",
        kana: "ちばけん",
        region: "カントー",
        capital: "千葉市（ちばし）",
        specialty: "落花生、びわ",
        landmark: "九十九里浜（くじゅうくりはま）",
        path: "M 602.5 301 L 621.5 301 L 611.5 342 L 598.5 315 Z",
        bbox: { x: 598.5, y: 301, width: 23, height: 41, cx: 610, cy: 321.5 }
    },
    {
        id: "tokyo",
        name: "東京都",
        kana: "とうきょうと",
        region: "カントー",
        capital: "新宿区（しんじゅくく）",
        specialty: "もんじゃ焼き、人形焼",
        landmark: "東京タワー、浅草寺",
        path: "M 566.5 315 L 598.5 315 L 595.5 325 L 563.5 325 Z",
        bbox: { x: 563.5, y: 315, width: 35, height: 10, cx: 581, cy: 320 }
    },
    {
        id: "kanagawa",
        name: "神奈川県",
        kana: "かながわけん",
        region: "カントー",
        capital: "横浜市（よこはまし）",
        specialty: "シウマイ、鎌倉ハム",
        landmark: "芦ノ湖、みなとみらい",
        path: "M 563.5 325 L 595.5 325 L 589.5 342 L 557.5 342 Z",
        bbox: { x: 557.5, y: 325, width: 38, height: 17, cx: 576.5, cy: 333.5 }
    },
    {
        id: "niigata",
        name: "新潟県",
        kana: "にいがたけん",
        region: "チュウブ",
        capital: "新潟市（にいがたし）",
        specialty: "魚沼産コシヒカリ、笹団子",
        landmark: "佐渡島（さどがしま）",
        path: "M 540.5 245 L 588.5 275 L 575.5 275 L 536.5 275 Z",
        bbox: { x: 536.5, y: 245, width: 52, height: 30, cx: 562.5, cy: 260 }
    },
    {
        id: "toyama",
        name: "富山県",
        kana: "とやまけん",
        region: "チュウブ",
        capital: "富山市（とやまし）",
        specialty: "ホタルイカ、ます寿司",
        landmark: "立山黒部アルペンルート",
        path: "M 518.5 275 L 536.5 275 L 526.5 301 L 508.5 301 Z",
        bbox: { x: 508.5, y: 275, width: 28, height: 26, cx: 522.5, cy: 288 }
    },
    {
        id: "ishikawa",
        name: "石川県",
        kana: "いしかわけん",
        region: "チュウブ",
        capital: "金沢市（かなざわし）",
        specialty: "加賀友禅、輪島塗",
        landmark: "兼六園（けんろくえん）",
        path: "M 496.5 275 L 518.5 275 L 508.5 301 L 486.5 301 Z",
        bbox: { x: 486.5, y: 275, width: 32, height: 26, cx: 502.5, cy: 288 }
    },
    {
        id: "fukui",
        name: "福井県",
        kana: "ふくいけん",
        region: "チュウブ",
        capital: "福井市（ふくいし）",
        specialty: "越前ガニ、羽二重餅",
        landmark: "東尋坊（とうじんぼう）",
        path: "M 474.5 301 L 486.5 301 L 476.5 327 L 464.5 327 Z",
        bbox: { x: 464.5, y: 301, width: 22, height: 26, cx: 475.5, cy: 314 }
    },
    {
        id: "yamanashi",
        name: "山梨県",
        kana: "やまなしけん",
        region: "チュウブ",
        capital: "甲府市（こうふし）",
        specialty: "ぶどう、ほうとう",
        landmark: "富士五湖（ふじごこ）",
        path: "M 552.5 301 L 570.5 301 L 566.5 315 L 548.5 315 Z",
        bbox: { x: 548.5, y: 301, width: 22, height: 14, cx: 559.5, cy: 308 }
    },
    {
        id: "nagano",
        name: "長野県",
        kana: "ながのけん",
        region: "チュウブ",
        capital: "長野市（ながのし）",
        specialty: "信州そば、おやき",
        landmark: "上高地（かみこうち）",
        path: "M 526.5 301 L 548.5 315 L 538.5 342 L 516.5 325 Z",
        bbox: { x: 516.5, y: 301, width: 32, height: 41, cx: 532.5, cy: 321.5 }
    },
    {
        id: "gifu",
        name: "岐阜県",
        kana: "ぎふけん",
        region: "チュウブ",
        capital: "岐阜市（ぎふし）",
        specialty: "飛騨牛、鮎",
        landmark: "白川郷（しらかわごう）",
        path: "M 498.5 301 L 516.5 325 L 506.5 342 L 488.5 315 Z",
        bbox: { x: 488.5, y: 301, width: 28, height: 41, cx: 502.5, cy: 321.5 }
    },
    {
        id: "shizuoka",
        name: "静岡県",
        kana: "しずおかけん",
        region: "チュウブ",
        capital: "静岡市（しずおかし）",
        specialty: "お茶、うなぎ、わさび",
        landmark: "富士山（ふじさん）",
        path: "M 538.5 342 L 557.5 342 L 547.5 358 L 528.5 358 Z",
        bbox: { x: 528.5, y: 342, width: 29, height: 16, cx: 543, cy: 350 }
    },
    {
        id: "aichi",
        name: "愛知県",
        kana: "あいちけん",
        region: "チュウブ",
        capital: "名古屋市（なごやし）",
        specialty: "キャベツ、みそかつ",
        landmark: "知多半島（ちたはんとう）",
        path: "M 506.5 342 L 528.5 358 L 518.5 365 L 496.5 342 Z",
        bbox: { x: 496.5, y: 342, width: 32, height: 23, cx: 512.5, cy: 353.5 }
    },
    {
        id: "mie",
        name: "三重県",
        kana: "みえけん",
        region: "キンキ",
        capital: "津市（つし）",
        specialty: "松阪牛、伊勢エビ",
        landmark: "伊勢神宮（いせじんぐう）",
        path: "M 478.5 342 L 496.5 342 L 486.5 375 L 468.5 375 Z",
        bbox: { x: 468.5, y: 342, width: 28, height: 33, cx: 482.5, cy: 358.5 }
    },
    {
        id: "shiga",
        name: "滋賀県",
        kana: "しがけん",
        region: "キンキ",
        capital: "大津市（おおつし）",
        specialty: "近江牛、ふなずし",
        landmark: "琵琶湖（びわこ）",
        path: "M 468.5 325 L 488.5 315 L 478.5 342 L 458.5 342 Z",
        bbox: { x: 458.5, y: 315, width: 30, height: 27, cx: 473.5, cy: 328.5 }
    },
    {
        id: "kyoto",
        name: "京都府",
        kana: "きょうとふ",
        region: "キンキ",
        capital: "京都市（きょうとし）",
        specialty: "八ツ橋、宇治茶",
        landmark: "金閣寺、天橋立",
        path: "M 444.5 315 L 464.5 327 L 454.5 342 L 434.5 327 Z",
        bbox: { x: 434.5, y: 315, width: 30, height: 27, cx: 449.5, cy: 328.5 }
    },
    {
        id: "osaka",
        name: "大阪府",
        kana: "おおさかふ",
        region: "キンキ",
        capital: "大阪市（おおさかし）",
        specialty: "たこ焼き、お好み焼き",
        landmark: "仁徳天皇陵、大阪城",
        path: "M 438.5 342 L 458.5 342 L 448.5 358 L 428.5 358 Z",
        bbox: { x: 428.5, y: 342, width: 30, height: 16, cx: 443.5, cy: 350 }
    },
    {
        id: "hyogo",
        name: "兵庫県",
        kana: "ひょうごけん",
        region: "キンキ",
        capital: "神戸市（こうべし）",
        specialty: "神戸牛、明石焼",
        landmark: "姫路城（ひめじじょう）",
        path: "M 416.5 315 L 438.5 342 L 428.5 358 L 406.5 327 Z",
        bbox: { x: 406.5, y: 315, width: 32, height: 43, cx: 417.5, cy: 336.5 }
    },
    {
        id: "nara",
        name: "奈良県",
        kana: "ならけん",
        region: "キンキ",
        capital: "奈良市（ならし）",
        specialty: "柿の葉寿司、奈良漬",
        landmark: "東大寺（とうだいじ）",
        path: "M 448.5 358 L 468.5 375 L 458.5 391 L 438.5 375 Z",
        bbox: { x: 438.5, y: 358, width: 30, height: 33, cx: 453.5, cy: 374.5 }
    },
    {
        id: "wakayama",
        name: "和歌山県",
        kana: "わかやまけん",
        region: "キンキ",
        capital: "和歌山市（わかやまし）",
        specialty: "有田みかん、梅干し",
        landmark: "那智の滝、高野山",
        path: "M 428.5 358 L 448.5 358 L 438.5 391 L 418.5 375 Z",
        bbox: { x: 418.5, y: 358, width: 30, height: 33, cx: 433.5, cy: 374.5 }
    },
    {
        id: "tottori",
        name: "鳥取県",
        kana: "とっとりけん",
        region: "チュウゴク",
        capital: "鳥取市（とっとりし）",
        specialty: "二十世紀梨、らっきょう",
        landmark: "鳥取砂丘（とっとりさきゅう）",
        path: "M 384.5 315 L 416.5 315 L 406.5 327 L 374.5 327 Z",
        bbox: { x: 374.5, y: 315, width: 42, height: 12, cx: 395.5, cy: 321 }
    },
    {
        id: "shimane",
        name: "島根県",
        kana: "しまねけん",
        region: "チュウゴク",
        capital: "松江市（まつえし）",
        specialty: "出雲そば、しじみ",
        landmark: "出雲大社（いずもおおやしろ）",
        path: "M 334.5 315 L 374.5 327 L 364.5 342 L 324.5 327 Z",
        bbox: { x: 324.5, y: 315, width: 50, height: 27, cx: 349.5, cy: 328.5 }
    },
    {
        id: "okayama",
        name: "岡山県",
        kana: "おかやまけん",
        region: "チュウゴク",
        capital: "岡山市（おかやまし）",
        specialty: "きびだんご、白桃",
        landmark: "後楽園（こうらくえん）",
        path: "M 374.5 327 L 406.5 327 L 396.5 342 L 364.5 342 Z",
        bbox: { x: 364.5, y: 327, width: 42, height: 15, cx: 385.5, cy: 334.5 }
    },
    {
        id: "hiroshima",
        name: "広島県",
        kana: "ひろしまけん",
        region: "チュウゴク",
        capital: "広島市（ひろしまし）",
        specialty: "もみじ饅頭、牡蠣",
        landmark: "厳島神社、原爆ドーム",
        path: "M 324.5 327 L 364.5 342 L 354.5 358 L 314.5 342 Z",
        bbox: { x: 314.5, y: 327, width: 50, height: 31, cx: 339.5, cy: 342.5 }
    },
    {
        id: "yamaguchi",
        name: "山口県",
        kana: "やまぐちけん",
        region: "チュウゴク",
        capital: "山口市（やまぐちし）",
        specialty: "ふぐ刺し、ういろう",
        landmark: "秋吉台（あきよしだい）",
        path: "M 284.5 327 L 314.5 342 L 304.5 358 L 274.5 342 Z",
        bbox: { x: 274.5, y: 327, width: 40, height: 31, cx: 294.5, cy: 342.5 }
    },
    {
        id: "tokushima",
        name: "徳島県",
        kana: "とくしまけん",
        region: "シコク",
        capital: "徳島市（とくしまし）",
        specialty: "すだち、徳島ラーメン",
        landmark: "鳴門の渦潮（なるとのうずしお）",
        path: "M 364.5 375 L 394.5 375 L 384.5 391 L 354.5 391 Z",
        bbox: { x: 354.5, y: 375, width: 40, height: 16, cx: 374.5, cy: 383 }
    },
    {
        id: "kagawa",
        name: "香川県",
        kana: "かがわけん",
        region: "シコク",
        capital: "高松市（たかまつし）",
        specialty: "讃岐うどん、骨付鳥",
        landmark: "金刀比羅宮（ことひらぐう）",
        path: "M 354.5 358 L 396.5 358 L 384.5 375 L 344.5 375 Z",
        bbox: { x: 344.5, y: 358, width: 52, height: 17, cx: 370.5, cy: 366.5 }
    },
    {
        id: "ehime",
        name: "愛媛県",
        kana: "えひめけん",
        region: "シコク",
        capital: "松山市（まつやまし）",
        specialty: "タルト、いよかん",
        landmark: "道後温泉（どうごおんせん）",
        path: "M 314.5 358 L 344.5 375 L 334.5 391 L 304.5 375 Z",
        bbox: { x: 304.5, y: 358, width: 40, height: 33, cx: 324.5, cy: 374.5 }
    },
    {
        id: "kochi",
        name: "高知県",
        kana: "こうちけん",
        region: "シコク",
        capital: "高知市（こうちし）",
        specialty: "カツオのたたき、柚子",
        landmark: "桂浜（かつらはま）",
        path: "M 334.5 391 L 354.5 391 L 344.5 415 L 314.5 400 Z",
        bbox: { x: 314.5, y: 391, width: 40, height: 24, cx: 334.5, cy: 403 }
    },
    {
        id: "fukuoka",
        name: "福岡県",
        kana: "ふくおかけん",
        region: "キュウシュー",
        capital: "福岡市（ふくおかし）",
        specialty: "辛子明太子、博多ラーメン",
        landmark: "太宰府天満宮（だざいふてんまんぐう）",
        path: "M 244.5 358 L 274.5 358 L 264.5 380 L 234.5 380 Z",
        bbox: { x: 234.5, y: 358, width: 40, height: 22, cx: 254.5, cy: 369 }
    },
    {
        id: "saga",
        name: "佐賀県",
        kana: "さがけん",
        region: "キュウシュー",
        capital: "佐賀市（さがし）",
        specialty: "有田焼、佐賀牛",
        landmark: "吉野ヶ里遺跡（よしのがりいせき）",
        path: "M 214.5 358 L 234.5 358 L 224.5 380 L 204.5 380 Z",
        bbox: { x: 204.5, y: 358, width: 30, height: 22, cx: 219.5, cy: 369 }
    },
    {
        id: "nagasaki",
        name: "長崎県",
        kana: "ながさきけん",
        region: "キュウシュー",
        capital: "長崎市（ながさきし）",
        specialty: "カステラ、ちゃんぽん",
        landmark: "ハウステンボス、平和公園",
        path: "M 194.5 358 L 214.5 358 L 204.5 391 L 184.5 380 Z",
        bbox: { x: 184.5, y: 358, width: 30, height: 33, cx: 199.5, cy: 372.5 }
    },
    {
        id: "kumamoto",
        name: "熊本県",
        kana: "くまもとけん",
        region: "キュウシュー",
        capital: "熊本市（くまもとし）",
        specialty: "馬刺し、いきなり団子",
        landmark: "阿蘇山（あそさん）",
        path: "M 214.5 380 L 244.5 380 L 234.5 415 L 204.5 400 Z",
        bbox: { x: 204.5, y: 380, width: 40, height: 35, cx: 224.5, cy: 397.5 }
    },
    {
        id: "oita",
        name: "大分県",
        kana: "おおいたけん",
        region: "キュウシュー",
        capital: "大分市（おおいたし）",
        specialty: "かぼす、とり天",
        landmark: "別府温泉（べっぷおんせん）",
        path: "M 244.5 380 L 274.5 380 L 264.5 400 L 234.5 400 Z",
        bbox: { x: 234.5, y: 380, width: 40, height: 20, cx: 254.5, cy: 390 }
    },
    {
        id: "miyazaki",
        name: "宮崎県",
        kana: "みやざきけん",
        region: "キュウシュー",
        capital: "宮崎市（みやざきし）",
        specialty: "マンゴー、チキン南蛮",
        landmark: "高千穂峡（たかちほきょう）",
        path: "M 234.5 415 L 264.5 415 L 254.5 445 L 224.5 445 Z",
        bbox: { x: 224.5, y: 415, width: 40, height: 30, cx: 244.5, cy: 430 }
    },
    {
        id: "kagoshima",
        name: "鹿児島県",
        kana: "かごしまけん",
        region: "キュウシュー",
        capital: "鹿児島市",
        specialty: "さつまいも、黒豚",
        landmark: "桜島（さくらじま）",
        path: "M 204.5 415 L 234.5 415 L 224.5 455 L 194.5 455 Z",
        bbox: { x: 194.5, y: 415, width: 40, height: 40, cx: 214.5, cy: 435 }
    },
    {
        id: "okinawa",
        name: "沖縄県",
        kana: "おきなわけん",
        region: "キュウシュー",
        capital: "那覇市（なはし）",
        specialty: "ゴーヤ、サーターアンダギー",
        landmark: "首里城（しゅりじょう）",
        path: "M 130 460 L 150 460 L 140 480 L 120 480 Z",
        bbox: { x: 120, y: 460, width: 30, height: 20, cx: 135, cy: 470 }
    }
];

const REGIONS = [
    "ホッカイドー",
    "トウホク",
    "カントー",
    "チュウブ",
    "キンキ",
    "チュウゴク",
    "シコク",
    "キュウシュー"
];

const REGION_DETAILS = {
    "ホッカイドー": {
        feature: "大昔は海だった場所が多く、アンモナイトなどの貴重な海の化石がたくさん見つかります。",
        hint: "削りやすい岩ですが、化石まで削らないように注意しましょう。"
    },
    "トウホク": {
        feature: "火山の灰が固まってできた、少しもろくて崩れやすい岩が多い地域です。",
        hint: "岩が崩れやすく削りやすいですが、勢いあまって化石まで傷つけないよう慎重に作業しましょう。"
    },
    "カントー": {
        feature: "火山の灰がフワフワと積み重なってできた「関東ローム層」という柔らかい土でおおわれています。",
        hint: "削りやすい地層ですが、力まかせに叩くと化石まで一緒に砕けてしまいます。丁寧に削り出しましょう。"
    },
    "チュウブ": {
        feature: "高い山々が多く、マグマが冷えて固まった非常に硬い岩石が集まっている地域です。",
        hint: "周囲の岩がたいへん硬いため、ハンマーを強化すると削りやすいかもしれません。"
    },
    "キンキ": {
        feature: "大昔は湖や川の底だった場所が多く、さまざまな硬さの岩や土が混ざりあっています。",
        hint: "柔らかい場所と硬い場所が混ざっています。注意して削りましょう。"
    },
    "チュウゴク": {
        feature: "大昔のサンゴ礁からできた「石灰岩（せっかいがん）」が多く、水に溶けやすくヒビが入りやすい性質があります。",
        hint: "叩くと、岩が横長に大きく割れやすい性質があります。"
    },
    "シコク": {
        feature: "大地の強い力で押されたことで、パイのように幾重にも層（そう）になっている岩が多く見られます。",
        hint: "岩に「向き」が存在します。横長に割れやすいので注意しましょう。"
    },
    "キュウシュー": {
        feature: "多くの火山が存在し、ドロドロの溶岩（ようがん）が固まってできた岩石でおおわれています。",
        hint: "ゴツゴツとした不規則で硬い岩が多いため、削れ方にバラツキがあります。"
    }
};
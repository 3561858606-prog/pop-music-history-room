import {lecture8, lecture8Styles, lecture8Tracks} from './lecture8.js';
import {lecture9, lecture9Styles, lecture9Tracks} from './lecture9.js';

export function courseMediaUrl(deck, path) {
  const base = catalog.lectures.find(lecture => lecture.id === deck)?.mediaBase;
  return base ? new URL(path, new URL(base, import.meta.url)).href : null;
}

export const catalog = {
  "lectures": [
    {
      "id": 1,
      "label": "概念与起源",
      "ko": "대중음악의 개념과 기원",
      "period": "19世纪末 · 20世纪初",
      "count": 4
    },
    {
      "id": 2,
      "label": "1920年代 · 一",
      "ko": "1920년대 대중음악 (1)",
      "period": "舞曲 · 爵士 · 锡盘巷",
      "count": 6
    },
    {
      "id": 3,
      "label": "1920年代 · 二",
      "ko": "1920년대 대중음악 (2)",
      "period": "蓝调 · 乡村音乐",
      "count": 6
    },
    {
      "id": 4,
      "label": "摇摆时代",
      "ko": "스윙시대",
      "period": "1935–1945 · 美国与韩国",
      "count": 13
    },
    {
      "id": 5,
      "label": "二战后的大众音乐",
      "ko": "2차 세계대전 이후의 대중음악",
      "period": "1945–1954 · 美国与韩国",
      "count": 13
    },
    {
      "id": 6,
      "label": "摇滚乐",
      "ko": "로큰롤",
      "period": "1954–1959",
      "count": 14
    },
    {
      "id": 7,
      "label": "1960年代 · 摇滚与灵魂乐",
      "ko": "1960년대 대중음악 (1) · 록과 소울",
      "period": "1960–1968 · 英国入侵 · 迷幻 · Soul",
      "count": 20
    },
    lecture8,
    lecture9
  ],
  "styles": [
    {
      "id": "parlor",
      "label": "Parlor Ballad",
      "sub": "客厅抒情歌曲",
      "ko": "응접실 발라드"
    },
    {
      "id": "ragtime",
      "label": "Ragtime",
      "sub": "拉格泰姆",
      "ko": "래그타임"
    },
    {
      "id": "early-jazz",
      "label": "Early Jazz / Dixieland",
      "sub": "早期爵士",
      "ko": "초기 재즈"
    },
    {
      "id": "dance",
      "label": "1920s Dance Music",
      "sub": "1920年代流行舞曲",
      "ko": "댄스 음악"
    },
    {
      "id": "tin-pan-alley",
      "label": "Tin Pan Alley · Crooner",
      "sub": "锡盘巷歌曲 · 低吟歌手",
      "ko": "틴 팬 앨리 · 크루너"
    },
    {
      "id": "standard-pop",
      "label": "Standard Pop",
      "sub": "标准流行歌曲",
      "ko": "스탠더드 팝"
    },
    {
      "id": "classic-blues",
      "label": "Classic Blues",
      "sub": "经典蓝调",
      "ko": "클래식 블루스"
    },
    {
      "id": "country-blues",
      "label": "Country Blues",
      "sub": "乡村蓝调",
      "ko": "컨트리 블루스"
    },
    {
      "id": "country",
      "label": "Hillbilly / Country",
      "sub": "早期乡村音乐",
      "ko": "힐빌리 · 컨트리"
    },
    {
      "id": "swing",
      "label": "Swing · Big Band Jazz",
      "sub": "摇摆乐 · 大乐队爵士",
      "ko": "스윙 · 빅밴드 재즈"
    },
    {
      "id": "western-swing",
      "label": "Western Swing",
      "sub": "西部摇摆",
      "ko": "웨스턴 스윙"
    },
    {
      "id": "afro-cuban",
      "label": "Afro-Cuban / Latin Jazz",
      "sub": "非洲古巴音乐 · 拉丁爵士",
      "ko": "아프로 쿠반 · 라틴 재즈"
    },
    {
      "id": "trot",
      "label": "Trot",
      "sub": "韩国演歌",
      "ko": "트로트"
    },
    {
      "id": "jazz-song",
      "label": "Korean Jazz Song",
      "sub": "韩国爵士歌曲",
      "ko": "재즈송"
    },
    {
      "id": "manyo",
      "label": "Manyo",
      "sub": "趣味歌 · 漫谣",
      "ko": "만요"
    },
    {
      "id": "urban-folk",
      "label": "Urban Folk",
      "sub": "城市民谣",
      "ko": "어번 포크"
    },
    {
      "id": "mambo",
      "label": "Mambo",
      "sub": "曼波",
      "ko": "맘보"
    },
    {
      "id": "jump-blues",
      "label": "Jump Blues",
      "sub": "跳跃蓝调",
      "ko": "점프 블루스"
    },
    {
      "id": "blues-crooner",
      "label": "Blues Crooner",
      "sub": "蓝调低吟",
      "ko": "블루스 크루너"
    },
    {
      "id": "electric-blues",
      "label": "Electric Blues",
      "sub": "电声蓝调",
      "ko": "일렉트릭 블루스"
    },
    {
      "id": "country-western",
      "label": "Country & Western",
      "sub": "乡村与西部音乐",
      "ko": "컨트리 앤드 웨스턴"
    },
    {
      "id": "rock-roll",
      "label": "Rock ’n’ Roll",
      "sub": "摇滚乐",
      "ko": "로큰롤"
    },
    {
      "id": "rockabilly",
      "label": "Rockabilly",
      "sub": "山地摇滚",
      "ko": "로커빌리"
    },
    {
      "id": "chicano-rock",
      "label": "Chicano Rock ’n’ Roll",
      "sub": "奇卡诺摇滚",
      "ko": "치카노 로큰롤"
    },
    {
      "id": "changga",
      "label": "Changga · Adapted Song",
      "sub": "唱歌 · 外来曲调改编歌谣",
      "ko": "창가 · 번안가요"
    },
    {
      "id": "early-korean-song",
      "label": "Early Korean Popular Song",
      "sub": "韩国早期创作歌谣",
      "ko": "초기 창작가요"
    },
    {
      "id": "rock",
      "label": "Rock",
      "sub": "摇滚",
      "ko": "록"
    },
    {
      "id": "psychedelic-rock",
      "label": "Psychedelic Rock",
      "sub": "迷幻摇滚",
      "ko": "사이키델릭 록"
    },
    {
      "id": "soul",
      "label": "Soul",
      "sub": "灵魂乐",
      "ko": "소울"
    },
    {
      "id": "tin-pan-alley-song",
      "label": "Tin Pan Alley",
      "sub": "锡盘巷歌曲",
      "ko": "틴 팬 앨리"
    },
    ...lecture8Styles,
    ...lecture9Styles
  ],
  "tracks": [
    {
      "deck": 1,
      "slide": 12,
      "artist": "Stephen Foster",
      "artistKo": "스티븐 포스터 · 斯蒂芬·福斯特",
      "artistRole": "作曲家",
      "song": "Jeanie with the Light Brown Hair",
      "songKo": "금발의 제니 · 金发珍妮",
      "year": 1854,
      "style": "parlor",
      "note": "课件考点是作曲家 Stephen Foster、1854年与 AABA 结构。这份音频由 Richard Crooks 演唱、Frank La Forge 钢琴伴奏，课件注明录于1937年。1854是作品年份，1937是这个版本的录音年份。客厅抒情歌曲的分类据美国国会图书馆补充。",
      "yearBasis": "课件标注年份",
      "sources": [
        {
          "label": "美国国会图书馆：作品年份与风格",
          "url": "https://www.loc.gov/collections/songs-of-america/articles-and-essays/articles-about-songs/jeanie/"
        }
      ],
      "id": "t01",
      "src": "audio/t01.mp3",
      "duration": 219.977,
      "sourceType": "audio"
    },
    {
      "deck": 2,
      "slide": 9,
      "artist": "James Reese Europe",
      "artistKo": "제임스 리스 유럽",
      "artistRole": "作曲家／乐队领队",
      "song": "Castle House Rag",
      "songKo": "캐슬 하우스 래그",
      "year": 1914,
      "style": "ragtime",
      "note": "课件给出的曲式是 AABBACCDEEF。内嵌名称 The Castles in Europe One-Step 是这首作品的另一名称；国会图书馆记录同时列出 Castle House Rag。请把多段 strain 与拉格泰姆联系起来。",
      "yearBasis": "课件标注年份",
      "aliases": [
        "The Castles in Europe One-Step"
      ],
      "sources": [
        {
          "label": "美国国会图书馆：同曲异名",
          "url": "https://www.loc.gov/resource/jukebox-134538.1"
        }
      ],
      "id": "t02",
      "src": "audio/t02.mp3",
      "duration": 216.973,
      "sourceType": "audio"
    },
    {
      "deck": 2,
      "slide": 10,
      "artist": "Original Dixieland Jazz Band",
      "artistKo": "오리지널 딕시랜드 재즈밴드 · ODJB",
      "artistRole": "演奏乐队",
      "song": "Tiger Rag",
      "songKo": "타이거 래그",
      "year": 1917,
      "style": "early-jazz",
      "note": "课件讲到 ODJB 在1917年留下最早的商业爵士录音，但没有单独写出 Tiger Rag 的年份。本题补充考作品首次录音年1917；美国国会图书馆同时记载其1918年的著名重录版。无法仅凭课件确定本音频采用哪次录音，因此这里不考当前版本的录音年。",
      "yearBasis": "首次录音年 · 补充考点",
      "sources": [
        {
          "label": "美国国会图书馆：1917首录与1918重录",
          "url": "https://www.loc.gov/static/programs/national-recording-preservation-board/documents/TigerRag.pdf"
        }
      ],
      "id": "t03",
      "src": "audio/t03.mp3",
      "duration": 188.003,
      "sourceType": "audio"
    },
    {
      "deck": 2,
      "slide": 11,
      "artist": "Paul Whiteman",
      "artistKo": "폴 화이트먼",
      "artistRole": "乐队领队",
      "song": "Whispering",
      "songKo": "속삭임",
      "year": 1920,
      "style": "dance",
      "note": "课件把 Paul Whiteman 放在1920年代的流行舞曲语境中，称为当时的“爵士之王”。这里按课件最具体的分类考1920年代流行舞曲；不要把这个称号与 Benny Goodman 的“摇摆之王”混淆。",
      "yearBasis": "课件标注年份",
      "id": "t04",
      "src": "audio/t04.mp3",
      "duration": 197.277,
      "sourceType": "audio"
    },
    {
      "deck": 2,
      "slide": 15,
      "artist": "Gene Austin",
      "artistKo": "진 오스틴",
      "artistRole": "歌手",
      "song": "My Blue Heaven",
      "songKo": "나의 우울한 천국",
      "year": 1927,
      "style": "tin-pan-alley",
      "note": "按课件记1927年。音频对象标题含“1928 HITS ARCHIVE”，本题不考榜单归档年份。课件将此曲作为锡盘巷个人主义、浪漫幻想及 crooner 潮流的例子。",
      "yearBasis": "课件标注年份",
      "id": "t05",
      "src": "audio/t05.mp3",
      "duration": 213.29,
      "sourceType": "audio"
    },
    {
      "deck": 2,
      "slide": 16,
      "artist": "Bing Crosby",
      "artistKo": "빙 크로스비",
      "artistRole": "歌手",
      "song": "How Deep Is the Ocean?",
      "songKo": "바다는 얼마나 깊을까?",
      "year": 1932,
      "style": "standard-pop",
      "note": "Bing Crosby 演唱，Irving Berlin 作曲。按课件记1932年、Standard Pop，结构为 서창–후렴，即前段／主歌与后段／副歌，后段采用 ABAC。",
      "yearBasis": "课件标注年份",
      "id": "t06",
      "src": "audio/t06.mp3",
      "duration": 192.81,
      "sourceType": "audio"
    },
    {
      "deck": 2,
      "slide": 16,
      "artist": "Ethel Merman",
      "artistKo": "에델 머먼",
      "artistRole": "歌手",
      "song": "I Got Rhythm",
      "songKo": "난 리듬을 알아요",
      "year": 1937,
      "style": "standard-pop",
      "note": "George Gershwin 作曲，课件给的是 Ethel Merman 的1937年广播演唱版本。本题按课件版本考1937，不把作品首演时间当作本题答案。后段为 AABA。",
      "yearBasis": "课件标注年份",
      "id": "t07",
      "src": "audio/t07.mp3",
      "duration": 136.411,
      "sourceType": "audio"
    },
    {
      "deck": 3,
      "slide": 4,
      "artist": "Bessie Smith",
      "artistKo": "베시 스미스",
      "artistRole": "歌手",
      "song": "St. Louis Blues",
      "songKo": "세인트루이스 블루스",
      "year": 1925,
      "style": "classic-blues",
      "note": "课件给 Bessie Smith 的版本标注1925年，归在 Classic Blues。不要与同页的 Down Hearted Blues（1923）混淆。课件分析曲式 AABA(C)，其中 A 是12小节蓝调。",
      "yearBasis": "课件标注年份",
      "id": "t08",
      "src": "audio/t08.mp3",
      "duration": 190.694,
      "sourceType": "audio"
    },
    {
      "deck": 3,
      "slide": 5,
      "artist": "Blind Lemon Jefferson",
      "artistKo": "블라인드 레몬 제퍼슨",
      "artistRole": "歌手／创作音乐家",
      "song": "Black Snake Moan",
      "songKo": "검은 뱀의 신음",
      "year": 1926,
      "style": "country-blues",
      "note": "按课件记1926年、Country Blues，亦称 Folk Blues。音频名是 That Black Snake Moan，作为曲名别称保留。课件强调乡村蓝调的口传性、自由变奏与唱作人特点。",
      "yearBasis": "课件标注年份",
      "aliases": [
        "That Black Snake Moan"
      ],
      "id": "t09",
      "src": "audio/t09.mp3",
      "duration": 179.696,
      "sourceType": "audio"
    },
    {
      "deck": 3,
      "slide": 8,
      "artist": "Jimmie Rodgers",
      "artistKo": "지미 로저스",
      "artistRole": "歌手",
      "song": "Waiting for a Train",
      "songKo": "기차를 기다리며",
      "year": 1929,
      "style": "country",
      "note": "课件标1929年，音频对象及标签写1928。练习按课件标注1929评分，不据文件名改动考试资料。课件强调 Rodgers 的流浪者气质，以及把蓝调元素引入乡村音乐。",
      "yearBasis": "课件标注年份",
      "discrepancy": "课件年份1929；音频标签1928。",
      "id": "t10",
      "src": "audio/t10.mp3",
      "duration": 167.105,
      "sourceType": "audio"
    },
    {
      "deck": 4,
      "slide": 3,
      "artist": "Benny Goodman",
      "artistKo": "베니 굿맨",
      "artistRole": "乐队领队",
      "song": "Sing, Sing, Sing",
      "songKo": "싱싱싱",
      "year": 1937,
      "style": "swing",
      "note": "Benny Goodman 是“摇摆之王”，演奏单簧管。按课件记1937年、Swing／Big Band Jazz。将强烈鼓点、大乐队与摇摆舞的整体感受联系起来。",
      "yearBasis": "课件标注年份",
      "id": "t11",
      "src": "audio/t11.mp3",
      "duration": 521.796,
      "sourceType": "audio"
    },
    {
      "deck": 4,
      "slide": 4,
      "artist": "Count Basie",
      "artistKo": "카운트 베이시",
      "artistRole": "乐队领队",
      "song": "One O'Clock Jump",
      "songKo": "한 시의 점프",
      "year": 1937,
      "style": "swing",
      "note": "按课件记 Count Basie、1937年。联系 Kansas City sound、head chart、riff 与 boogie-woogie；这些是课件强调的关联考点。",
      "yearBasis": "课件标注年份",
      "id": "t12",
      "src": "audio/t12.mp3",
      "duration": 181.943,
      "sourceType": "audio"
    },
    {
      "deck": 4,
      "slide": 4,
      "artist": "Glenn Miller",
      "artistKo": "글렌 밀러",
      "artistRole": "乐队领队",
      "song": "In the Mood",
      "songKo": "인 더 무드",
      "year": 1939,
      "style": "swing",
      "note": "课件标1939年，音频对象的“1940 HITS ARCHIVE”是另一种年份标签。本题按课件记1939。课件强调 Miller 明快的编曲与白人中产阶级听众。",
      "yearBasis": "课件标注年份",
      "id": "t13",
      "src": "audio/t13.mp3",
      "duration": 215.458,
      "sourceType": "audio"
    },
    {
      "deck": 4,
      "slide": 4,
      "artist": "Duke Ellington",
      "artistKo": "듀크 엘링턴",
      "artistRole": "作曲家／乐队领队",
      "song": "It Don't Mean a Thing (If It Ain't Got That Swing)",
      "songKo": "스윙하지 않으면 의미가 없어요",
      "year": 1932,
      "style": "swing",
      "note": "按课件记1932年。Duke Ellington 是大乐队领队与爵士作曲家，1927–1931年在 Cotton Club 任音乐主管。歌名自身就是联系 Swing 的记忆线索。",
      "yearBasis": "课件标注年份",
      "id": "t14",
      "src": "audio/t14.mp3",
      "duration": 188.395,
      "sourceType": "audio"
    },
    {
      "deck": 4,
      "slide": 6,
      "artist": "Bob Wills and His Texas Playboys",
      "artistKo": "밥 윌스와 텍사스 플레이보이스",
      "artistRole": "乐队／领队",
      "song": "New San Antonio Rose",
      "songKo": "뉴 샌안토니오의 장미",
      "year": 1941,
      "style": "western-swing",
      "note": "课件明确用箭头将这首曲子归到 Western Swing。按课件记1941年。它属于乡村音乐与摇摆乐交汇的类别，本题选最具体的 Western Swing。",
      "yearBasis": "课件标注年份",
      "id": "t15",
      "src": "audio/t15.mp3",
      "duration": 156.761,
      "sourceType": "audio"
    },
    {
      "deck": 4,
      "slide": 7,
      "artist": "Mario Bauzá",
      "artistKo": "마리오 바우자",
      "artistRole": "课件关联音乐家",
      "song": "Nagüe",
      "songKo": "친구",
      "year": 1941,
      "style": "afro-cuban",
      "note": "课件将 Nagüe（1941）列在 Mario Bauzá 的介绍下，因此音乐家一栏考课件关联人物 Bauzá。这份音频标签的演奏团体是 Machito & His Afro-Cubans；不是说 Bauzá 是此录音的主唱。与 Tanga 同属本页非洲古巴／拉丁音乐语境。",
      "yearBasis": "课件标注年份",
      "aliases": [
        "Nague"
      ],
      "id": "t16",
      "src": "audio/t16.mp3",
      "duration": 226.403,
      "sourceType": "audio"
    },
    {
      "deck": 4,
      "slide": 7,
      "artist": "Machito",
      "artistKo": "마치토",
      "artistRole": "乐队领队",
      "song": "Tanga",
      "songKo": "탕가",
      "year": 1943,
      "style": "afro-cuban",
      "note": "按课件记 Machito、1943年，联系 Afro-Cubans、多件拉丁打击乐器与 polyrhythm（复节奏）。课件同时介绍 Mario Bauzá 对非洲古巴爵士的重要作用。",
      "yearBasis": "课件标注年份",
      "id": "t17",
      "src": "audio/t17.mp3",
      "duration": 402.155,
      "sourceType": "audio"
    },
    {
      "deck": 4,
      "slide": 8,
      "artist": "이애리수",
      "artistKo": "Lee Ae-risu",
      "artistRole": "课件歌手",
      "song": "황성의 적",
      "songKo": "荒城之迹 · 课件原题",
      "year": 1932,
      "style": "trot",
      "note": "按课件记 이애리수、1932年、트로트。保留教授课件写法 황성의 적，方便与考试题目对应。",
      "yearBasis": "课件标注年份",
      "id": "t18",
      "src": "audio/t18.mp3",
      "duration": 165.616,
      "sourceType": "audio"
    },
    {
      "deck": 4,
      "slide": 8,
      "artist": "남인수",
      "artistKo": "Nam In-soo",
      "artistRole": "歌手",
      "song": "애수의 소야곡",
      "songKo": "哀愁的小夜曲",
      "year": 1938,
      "style": "trot",
      "note": "按课件记 남인수、1938年、트로트。音频对象也注明1938年原唱版本。不要与同页1938年的 만요 混淆。",
      "yearBasis": "课件标注年份",
      "id": "t19",
      "src": "audio/t19.mp3",
      "duration": 224.366,
      "sourceType": "audio"
    },
    {
      "deck": 4,
      "slide": 8,
      "artist": "김해송",
      "artistKo": "Kim Hae-song",
      "artistRole": "课件音乐家",
      "song": "청춘계급",
      "songKo": "青春阶级 · 课件标注",
      "year": 1939,
      "style": "jazz-song",
      "note": "课件标注 김해송—청춘계급—1939—재즈송。但内嵌音频标签是 artist=양양、title=청춘，二者不一致。标签也可能被误填，尚未确认声音对应关系。此条仅按课件知识评分，不能据这段声音建立确定的曲目识别记忆。",
      "yearBasis": "课件标注年份",
      "uncertainAudio": true,
      "discrepancy": "内嵌标签“양양 / 청춘”与课件“김해송 / 청춘계급”不同。",
      "id": "t20",
      "src": "audio/t20.mp3",
      "duration": 188.52,
      "sourceType": "audio"
    },
    {
      "deck": 4,
      "slide": 8,
      "artist": "손목인",
      "artistKo": "Son Mok-in",
      "artistRole": "课件音乐家",
      "song": "싱싱싱",
      "songKo": "韩国爵士歌曲 · 课件标注",
      "year": 1939,
      "style": "jazz-song",
      "note": "课件标注 손목인—싱싱싱—1939—재즈송。但内嵌音频标签是 Pepe & The Bottle Blondes—Sing Sing Sing，二者不一致。尚未确认教授是否用其他版本作示例。此条仅按课件知识评分，不能据此音频确认1939年的韩国版本。",
      "yearBasis": "课件标注年份",
      "uncertainAudio": true,
      "discrepancy": "内嵌标签的音乐家是 Pepe & The Bottle Blondes，与课件 손목인 不同。",
      "id": "t21",
      "src": "audio/t21.mp3",
      "duration": 196.493,
      "sourceType": "audio"
    },
    {
      "deck": 4,
      "slide": 8,
      "artist": "박향림",
      "artistKo": "Park Hyang-lim",
      "artistRole": "歌手",
      "song": "오빠는 풍각쟁이",
      "songKo": "哥哥是卖艺人",
      "year": 1938,
      "style": "manyo",
      "note": "按课件记 박향림、1938年、만요。音频对象写 오빠는 풍각쟁이야，作为曲名别称保留。与同页的 트로트、재즈송 区分。",
      "yearBasis": "课件标注年份",
      "aliases": [
        "오빠는 풍각쟁이야"
      ],
      "id": "t22",
      "src": "audio/t22.mp3",
      "duration": 174.696,
      "sourceType": "audio"
    },
    {
      "deck": 4,
      "slide": 8,
      "artist": "이난영",
      "artistKo": "Lee Nan-young",
      "artistRole": "歌手",
      "song": "목포의 눈물",
      "songKo": "木浦的眼泪",
      "year": 1935,
      "style": "trot",
      "note": "按课件记 이난영、1935年、트로트。将木浦、이난영 与1935年作为一组记忆。",
      "yearBasis": "课件标注年份",
      "id": "t23",
      "src": "audio/t23.mp3",
      "duration": 174.132,
      "sourceType": "audio"
    },
    {
      "deck": 5,
      "slide": 6,
      "artist": "Frank Sinatra",
      "artistKo": "프랭크 시나트라 · 弗兰克·辛纳屈",
      "artistRole": "歌手",
      "song": "Nancy (With the Laughing Face)",
      "songKo": "낸시 · 南希",
      "year": 1945,
      "style": "standard-pop",
      "note": "课件以 Nancy（1945）介绍 Frank Sinatra。归入本章 Traditional Pop／Standard Pop，联系从大乐队到独唱歌手的转变、crooner 唱法与麦克风的运用。保留课件简称 Nancy，完整曲名来自小喇叭对象标题。",
      "yearBasis": "课件标注年份",
      "aliases": [
        "Nancy"
      ],
      "id": "t24",
      "src": "audio/t24.mp3",
      "duration": 199.288,
      "sourceType": "audio"
    },
    {
      "deck": 5,
      "slide": 7,
      "artist": "Nat King Cole",
      "artistKo": "냇 킹 콜 · 纳特·金·科尔",
      "artistRole": "歌手",
      "song": "Nature Boy",
      "songKo": "네이처 보이 · 自然之子",
      "year": 1948,
      "style": "standard-pop",
      "note": "按课件记 Nat King Cole、Nature Boy、1948年，属于 Traditional Pop／Standard Pop。不要与同页 Mona Lisa（1950）混淆：本页的小喇叭是 Nature Boy。",
      "yearBasis": "课件标注年份",
      "id": "t25",
      "src": "audio/t25.mp3",
      "duration": 173.448,
      "sourceType": "audio"
    },
    {
      "deck": 5,
      "slide": 8,
      "artist": "Pete Seeger",
      "artistKo": "피트 시거 · 皮特·西格",
      "artistRole": "歌手",
      "song": "We Shall Overcome",
      "songKo": "우리 승리하리라 · 我们终将胜利",
      "year": 1947,
      "style": "urban-folk",
      "note": "课件列出 Pete Seeger—We Shall Overcome—1947，归在 Urban Folk。本题按课件年份评分，不据1947推定所附版本的实际录音时间。联系城市青年知识群体、The Weavers 与麦卡锡主义。",
      "yearBasis": "课件标注年份",
      "id": "t26",
      "src": "audio/t26.mp3",
      "duration": 282.279,
      "sourceType": "audio"
    },
    {
      "deck": 5,
      "slide": 9,
      "artist": "Pérez Prado",
      "artistKo": "페레즈 프라도 · 佩雷斯·普拉多",
      "artistRole": "乐队领队",
      "song": "Mambo No. 5",
      "songKo": "맘보 5번 · 第五号曼波",
      "year": 1949,
      "style": "mambo",
      "note": "按课件记 Pérez Prado、1949年、Mambo。小喇叭对象标题写“1949 or 1950”，课件明确给1949，因此练习按1949评分。同页的 Mambo Italiano（1954）没有对应小喇叭，不另造音频题。",
      "yearBasis": "课件标注年份",
      "aliases": [
        "Perez Prado"
      ],
      "discrepancy": "课件标1949；小喇叭对象标题写1949 or 1950。",
      "id": "t27",
      "src": "audio/t27.mp3",
      "duration": 167.628,
      "sourceType": "audio"
    },
    {
      "deck": 5,
      "slide": 11,
      "artist": "Louis Jordan",
      "artistKo": "루이 조던 · 路易斯·乔丹",
      "artistRole": "歌手",
      "song": "Choo Choo Ch’ Boogie",
      "songKo": "추추추 부기 · 火车布吉",
      "year": 1946,
      "style": "jump-blues",
      "note": "课件和小喇叭对象标题都标 Louis Jordan、1946年，最具体分类为 Jump Blues。内嵌 artist 标签却是 Bill Haley & His Comets，声音对应关系尚未确认，仅按课件知识评分。联系缩小的大乐队编制、轻快舞曲与对摇滚乐的影响。",
      "yearBasis": "课件标注年份",
      "uncertainAudio": true,
      "discrepancy": "课件及对象标题为 Louis Jordan；内嵌 artist=Bill Haley & His Comets。",
      "aliases": [
        "Choo Choo Ch'Boogie",
        "Choo Choo Ch' Boogie"
      ],
      "id": "t28",
      "src": "audio/t28.mp3",
      "duration": 162.09,
      "sourceType": "audio"
    },
    {
      "deck": 5,
      "slide": 11,
      "artist": "Charles Brown",
      "artistKo": "찰스 브라운 · 查尔斯·布朗",
      "artistRole": "歌手",
      "song": "Black Night",
      "songKo": "블랙 나이트 · 黑夜",
      "year": 1951,
      "style": "blues-crooner",
      "note": "课件标 Charles Brown—Black Night—1951，归在 Blues Crooner。对象标题写1950，内嵌标签却为 artist=Ben Sidran、title=Charles Brown，声音对应关系尚未确认。练习按课件1951评分，不能据这段声音确定录音身份。",
      "yearBasis": "课件标注年份",
      "uncertainAudio": true,
      "discrepancy": "课件为 Charles Brown / Black Night / 1951；对象标题1950；内嵌标签为 Ben Sidran / Charles Brown。",
      "id": "t29",
      "src": "audio/t29.mp3",
      "duration": 189.205,
      "sourceType": "audio"
    },
    {
      "deck": 5,
      "slide": 12,
      "artist": "Muddy Waters",
      "artistKo": "머디 워터스 · 马迪·沃特斯",
      "artistRole": "歌手",
      "song": "Hoochie Coochie Man",
      "songKo": "후치쿠치맨",
      "year": 1954,
      "style": "electric-blues",
      "note": "按课件记 Muddy Waters、1954年、Electric Blues。联系从南方三角洲乡村蓝调到芝加哥都市电声的转变。同页还介绍 Vocal Harmony Group，但小喇叭对应 Hoochie Coochie Man。",
      "yearBasis": "课件标注年份",
      "aliases": [
        "[I'm Your] Hoochie Coochie Man",
        "I'm Your Hoochie Coochie Man"
      ],
      "id": "t30",
      "src": "audio/t30.mp3",
      "duration": 170.083,
      "sourceType": "audio"
    },
    {
      "deck": 5,
      "slide": 13,
      "artist": "Big Mama Thornton",
      "artistKo": "빅 마마 손턴 · 大妈妈桑顿",
      "artistRole": "歌手",
      "song": "Hound Dog",
      "songKo": "하운드 도그 · 猎犬",
      "year": 1952,
      "style": "electric-blues",
      "note": "Big Mama Thornton 的 Hound Dog 统一按1952年评分，归入 Electric Blues。第五讲第13页与第六讲第5页使用同一段音频，合并为一首曲目，两讲单独选择时均可练习。",
      "yearBasis": "两讲统一年份",
      "appearances": [
        {
          "deck": 5,
          "slide": 13
        },
        {
          "deck": 6,
          "slide": 5
        }
      ],
      "legacyIds": [
        "t40"
      ],
      "id": "t31",
      "src": "audio/t31.mp3",
      "duration": 169.012,
      "sourceType": "audio"
    },
    {
      "deck": 5,
      "slide": 14,
      "artist": "Patti Page",
      "artistKo": "패티 페이지 · 帕蒂·佩姬",
      "artistRole": "歌手",
      "song": "Tennessee Waltz",
      "songKo": "테네시 왈츠 · 田纳西华尔兹",
      "year": 1951,
      "style": "country-western",
      "note": "课件与小喇叭对象标题介绍 Patti Page 及1951年的走红情况，归在 Country & Western；联系 overdubbing（叠录）与45转单曲。内嵌 artist 标签却为 David Bromberg，声音对应关系尚未确认。练习按课件的走红年份1951评分，不将其当作当前版本录音年份。",
      "yearBasis": "课件列举的走红年份 · 非录音年",
      "uncertainAudio": true,
      "discrepancy": "课件及对象标题为 Patti Page；内嵌 artist=David Bromberg。",
      "id": "t32",
      "src": "audio/t32.mp3",
      "duration": 181.238,
      "sourceType": "audio"
    },
    {
      "deck": 5,
      "slide": 17,
      "artist": "Hank Williams",
      "artistKo": "행크 윌리엄스 · 汉克·威廉姆斯",
      "artistRole": "歌手",
      "song": "I'm So Lonesome I Could Cry",
      "songKo": "외로워서 울 것 같아요 · 我孤独得想哭",
      "year": 1949,
      "style": "country-western",
      "note": "课件列出 Hank Williams—1949，位于 Country & Western 章节。内嵌 artist 标签却为 Link Wray，声音对应关系尚未确认，仅按课件知识评分。同页还有 Hey, Good Looking（1951），但本页唯一小喇叭的对象标题对应前一首。",
      "yearBasis": "课件标注年份",
      "uncertainAudio": true,
      "discrepancy": "课件为 Hank Williams / I'm So Lonesome I Could Cry / 1949；内嵌 artist=Link Wray。",
      "id": "t33",
      "src": "audio/t33.mp3",
      "duration": 167.471,
      "sourceType": "audio"
    },
    {
      "deck": 5,
      "slide": 19,
      "artist": "남인수",
      "artistKo": "Nam In-su · 南仁树",
      "artistRole": "歌手",
      "song": "가거라 삼팔선",
      "songKo": "去吧，三八线",
      "year": 1948,
      "style": "trot",
      "note": "按课件记 남인수、가거라 삼팔선、1948年。本章讨论解放与战争时期的韩国大众音乐；练习延用前一讲的 Trot 分类。歌名、音乐家与年份均有小喇叭对象标题对应，风格是跨讲关联归类。 Trot 为补充分类，依据 Genie 的曲目信息，非本页课件原文。",
      "yearBasis": "课件标注年份",
      "styleBasis": "Trot 分类为补充考点 · 据 Genie 曲目信息",
      "sources": [
        {
          "label": "Genie：Trot 风格归类（补充）",
          "url": "https://www.genie.co.kr/detail/songInfo?xgnm=80672867"
        }
      ],
      "id": "t34",
      "src": "audio/t34.mp3",
      "duration": 174.994,
      "sourceType": "audio"
    },
    {
      "deck": 5,
      "slide": 19,
      "artist": "신세영",
      "artistKo": "Shin Se-yeong · 申世影",
      "artistRole": "歌手",
      "song": "전선야곡",
      "songKo": "战线夜曲",
      "year": 1952,
      "style": "trot",
      "note": "按课件和小喇叭对象标题记 신세영、전선야곡、1952年。本章置于韩国战争时期背景；练习延用前一讲的 Trot 分类。课件本页没有单独标风格，风格属于跨讲关联归类。 Trot 为补充分类，依据 Genie 的曲目信息，非本页课件原文。",
      "yearBasis": "课件标注年份",
      "styleBasis": "Trot 分类为补充考点 · 据 Genie 曲目信息",
      "sources": [
        {
          "label": "Genie：Trot 风格归类（补充）",
          "url": "https://www.genie.co.kr/detail/songInfo?xgnm=40658021"
        }
      ],
      "id": "t35",
      "src": "audio/t35.mp3",
      "duration": 205.14,
      "sourceType": "audio"
    },
    {
      "deck": 5,
      "slide": 19,
      "artist": "남인수",
      "artistKo": "Nam In-su · 南仁树",
      "artistRole": "歌手",
      "song": "이별의 부산 정거장",
      "songKo": "离别的釜山车站",
      "year": 1954,
      "style": "trot",
      "note": "按课件和小喇叭对象标题记 남인수、1954年。本章置于停战后韩国大众音乐背景；练习延用前一讲的 Trot 分类。课件本页没有单独标风格，风格属于跨讲关联归类。 Trot 为补充分类，依据 Genie 的曲目信息，非本页课件原文。",
      "yearBasis": "课件标注年份",
      "aliases": [
        "이별의 부산정거장"
      ],
      "styleBasis": "Trot 分类为补充考点 · 据 Genie 曲目信息",
      "sources": [
        {
          "label": "Genie：Trot 风格归类（补充）",
          "url": "https://www.genie.co.kr/detail/songInfo?xgnm=82400867"
        }
      ],
      "id": "t36",
      "src": "audio/t36.mp3",
      "duration": 199.079,
      "sourceType": "audio"
    },
    {
      "deck": 6,
      "slide": 3,
      "artist": "Bill Haley & His Comets",
      "artistKo": "빌 헤일리와 더 코미츠",
      "artistRole": "演唱者／乐队",
      "song": "Rock Around the Clock",
      "songKo": "하루 종일 로큰롤",
      "year": 1955,
      "style": "rock-roll",
      "note": "第六讲第3页小喇叭对应曲目。年份按本讲课件标注评分。1955为课件强调的榜单突破年份。",
      "yearBasis": "第六讲课件年份",
      "id": "t37",
      "src": "audio/t37.mp3",
      "duration": 130.299,
      "sourceType": "audio"
    },
    {
      "deck": 6,
      "slide": 5,
      "artist": "Big Joe Turner",
      "artistKo": "빅 조 터너",
      "artistRole": "演唱者／乐队",
      "song": "Shake, Rattle and Roll",
      "songKo": "셰이크 래틀 앤 롤",
      "year": 1954,
      "style": "jump-blues",
      "note": "第六讲第5页小喇叭对应曲目。年份按本讲课件标注评分。课件对应 Big Joe Turner，内嵌 artist 标签为 Santo & Johnny，实际版本待核实。",
      "yearBasis": "第六讲课件年份",
      "uncertainAudio": true,
      "discrepancy": "课件对应 Big Joe Turner，内嵌 artist 标签为 Santo & Johnny，实际版本待核实。",
      "id": "t38",
      "src": "audio/t38.mp3",
      "duration": 180.062,
      "sourceType": "audio"
    },
    {
      "deck": 6,
      "slide": 5,
      "artist": "Bill Haley & His Comets",
      "artistKo": "빌 헤일리와 더 코미츠",
      "artistRole": "演唱者／乐队",
      "song": "Shake, Rattle and Roll",
      "songKo": "셰이크 래틀 앤 롤",
      "year": 1954,
      "style": "rock-roll",
      "note": "第六讲第5页小喇叭对应曲目。年份按本讲课件标注评分。课件对应 Bill Haley & His Comets，内嵌 artist 标签为 Carl Perkins，实际版本待核实。",
      "yearBasis": "第六讲课件年份",
      "uncertainAudio": true,
      "discrepancy": "课件对应 Bill Haley & His Comets，内嵌 artist 标签为 Carl Perkins，实际版本待核实。",
      "id": "t39",
      "src": "audio/t39.mp3",
      "duration": 149.107,
      "sourceType": "audio"
    },
    {
      "deck": 6,
      "slide": 7,
      "artist": "Chuck Berry",
      "artistKo": "척 베리",
      "artistRole": "演唱者／乐队",
      "song": "Johnny B. Goode",
      "songKo": "조니 비 굿",
      "year": 1958,
      "style": "rock-roll",
      "note": "第六讲第7页小喇叭对应曲目。年份按本讲课件标注评分。",
      "yearBasis": "第六讲课件年份",
      "id": "t41",
      "src": "audio/t41.mp3",
      "duration": 158.38,
      "sourceType": "audio"
    },
    {
      "deck": 6,
      "slide": 7,
      "artist": "Little Richard",
      "artistKo": "리틀 리처드",
      "artistRole": "演唱者／乐队",
      "song": "Long Tall Sally",
      "songKo": "키다리 샐리",
      "year": 1956,
      "style": "rock-roll",
      "note": "第六讲第7页小喇叭对应曲目。年份按本讲课件标注评分。课件对应 Little Richard，内嵌 artist 标签为 ADZ，实际版本待核实。",
      "yearBasis": "第六讲课件年份",
      "uncertainAudio": true,
      "discrepancy": "课件对应 Little Richard，内嵌 artist 标签为 ADZ，实际版本待核实。",
      "id": "t42",
      "src": "audio/t42.mp3",
      "duration": 132.754,
      "sourceType": "audio"
    },
    {
      "deck": 6,
      "slide": 8,
      "artist": "Fats Domino",
      "artistKo": "패츠 도미노",
      "artistRole": "演唱者／乐队",
      "song": "Blueberry Hill",
      "songKo": "블루베리 힐",
      "year": 1956,
      "style": "rock-roll",
      "note": "第六讲第8页小喇叭对应曲目。年份按本讲课件标注评分。",
      "yearBasis": "第六讲课件年份",
      "id": "t43",
      "src": "audio/t43.mp3",
      "duration": 141.949,
      "sourceType": "audio"
    },
    {
      "deck": 6,
      "slide": 9,
      "artist": "Elvis Presley",
      "artistKo": "엘비스 프레슬리",
      "artistRole": "演唱者／乐队",
      "song": "Don’t Be Cruel",
      "songKo": "잔인하게 굴지 말아요",
      "year": 1956,
      "style": "rockabilly",
      "note": "第六讲第9页小喇叭对应曲目。年份按本讲课件标注评分。",
      "yearBasis": "第六讲课件年份",
      "id": "t44",
      "src": "audio/t44.mp3",
      "duration": 121.704,
      "sourceType": "audio"
    },
    {
      "deck": 6,
      "slide": 10,
      "artist": "Buddy Holly & The Crickets",
      "artistKo": "버디 홀리와 크리케츠",
      "artistRole": "演唱者／乐队",
      "song": "That’ll Be the Day",
      "songKo": "바로 그날 일거야",
      "year": 1957,
      "style": "rock-roll",
      "note": "第六讲第10页小喇叭对应曲目。年份按本讲课件标注评分。",
      "yearBasis": "第六讲课件年份",
      "id": "t45",
      "src": "audio/t45.mp3",
      "duration": 135.34,
      "sourceType": "audio"
    },
    {
      "deck": 6,
      "slide": 12,
      "artist": "The Coasters",
      "artistKo": "코스터스",
      "artistRole": "演唱者／乐队",
      "song": "Charlie Brown",
      "songKo": "찰리 브라운",
      "year": 1959,
      "style": "rock-roll",
      "note": "第六讲第12页小喇叭对应曲目。年份按本讲课件标注评分。演唱团体为 The Coasters；课件本页重点介绍创作者 Jerry Leiber 与 Mike Stoller。",
      "yearBasis": "第六讲课件年份",
      "id": "t46",
      "src": "audio/t46.mp3",
      "duration": 138.136,
      "sourceType": "audio"
    },
    {
      "deck": 6,
      "slide": 13,
      "artist": "Johnny Mathis",
      "artistKo": "조니 마티스",
      "artistRole": "演唱者／乐队",
      "song": "Misty",
      "songKo": "미스티",
      "year": 1959,
      "style": "standard-pop",
      "note": "第六讲第13页小喇叭对应曲目。年份按本讲课件标注评分。",
      "yearBasis": "第六讲课件年份",
      "id": "t47",
      "src": "audio/t47.mp3",
      "duration": 218.175,
      "sourceType": "audio"
    },
    {
      "deck": 6,
      "slide": 14,
      "artist": "Ritchie Valens",
      "artistKo": "리치 발렌스",
      "artistRole": "演唱者／乐队",
      "song": "La Bamba",
      "songKo": "라밤바",
      "year": 1958,
      "style": "chicano-rock",
      "note": "第六讲第14页小喇叭对应曲目。年份按本讲课件标注评分。",
      "yearBasis": "第六讲课件年份",
      "id": "t48",
      "src": "audio/t48.mp3",
      "duration": 129.149,
      "sourceType": "audio"
    },
    {
      "deck": 6,
      "slide": 14,
      "artist": "The Champs",
      "artistKo": "챔프스",
      "artistRole": "演唱者／乐队",
      "song": "Tequila",
      "songKo": "테킬라",
      "year": 1958,
      "style": "chicano-rock",
      "note": "第六讲第14页小喇叭对应曲目。年份按本讲课件标注评分。",
      "yearBasis": "第六讲课件年份",
      "id": "t49",
      "src": "audio/t49.mp3",
      "duration": 131.971,
      "sourceType": "audio"
    },
    {
      "deck": 1,
      "slide": 14,
      "sourceType": "video",
      "artist": "Scott Joplin",
      "artistKo": "스콧 조플린 · 斯科特·乔普林",
      "artistRole": "作曲家",
      "song": "Maple Leaf Rag",
      "songKo": "단풍잎 래그 · 枫叶拉格",
      "aliases": [
        "Maple leaf Rag"
      ],
      "year": 1899,
      "yearBasis": "课件第13页的作品出版年 · 非本视频拍摄年",
      "style": "ragtime",
      "versionLabel": "自动钢琴示例 · 第1讲第14页",
      "note": "第13页明确列出 Scott Joplin、Maple Leaf Rag、1899及 Ragtime；第14页视频对象名为 Maple leaf rag played by Scott Joplin，画面为自动钢琴。音乐家一栏考作曲家 Scott Joplin，不将拍摄者或自动钢琴当作演奏者；1899是作品年份，不是视频或钢琴卷的录制年份。仅凭该课件不能确认钢琴卷制作日期，保留未知。",
      "sources": [
        {
          "label": "美国国会图书馆：Joplin 与1899年作品",
          "url": "https://www.loc.gov/collections/ragtime/articles-and-essays/history-of-ragtime/"
        }
      ],
      "id": "t50",
      "src": "audio/t50.mp3?v=music-51c879735abc",
      "duration": 150.831,
      "audioEdit": {
        "revision": 1,
        "start": 8.86,
        "end": 159.65,
        "fadeIn": 0.012,
        "fadeOut": 0.08,
        "untrimmedDuration": 161.28,
        "untrimmedSha256": "532b6388c20f7f93f4cdfa8b9e8e72d33d1a859be03fb2328888b6cf80c4799d",
        "reason": "移除自动钢琴启动、操作声及曲终后的设备声；保留完整音乐和余音。"
      }
    },
    {
      "deck": 1,
      "slide": 15,
      "sourceType": "video",
      "artist": "Scott Joplin",
      "artistKo": "스콧 조플린 · 斯科特·乔普林",
      "artistRole": "作曲家",
      "song": "Maple Leaf Rag",
      "songKo": "단풍잎 래그 · 枫叶拉格",
      "aliases": [
        "Maple leaf Rag"
      ],
      "year": 1899,
      "yearBasis": "课件第13页的作品出版年 · 非该版本录音年",
      "style": "ragtime",
      "versionLabel": "班卓琴／圆筒留声机示例 · 第1讲第15页",
      "note": "视频对象名为 Edison Standard Phonograph - Maple Leaf Rag (Banjo)，展示圆筒留声机播放班卓琴版本。按第13页考作品 Maple Leaf Rag、作曲家 Scott Joplin、1899年、Ragtime；Scott Joplin 不是此班卓琴录音的已确认演奏者。课件没有注明此录音的演奏者和录音年，不作推断。此示例与自动钢琴、唱片留声机版本分别保留。",
      "sources": [
        {
          "label": "美国国会图书馆：作品与风格",
          "url": "https://www.loc.gov/collections/ragtime/articles-and-essays/history-of-ragtime/"
        }
      ],
      "id": "t51",
      "src": "audio/t51.mp3?v=music-3e9f7dd92ebb",
      "duration": 137.822,
      "audioEdit": {
        "revision": 1,
        "start": 14.48,
        "end": 152.25,
        "fadeIn": 0.012,
        "fadeOut": 0.08,
        "untrimmedDuration": 156.525714,
        "untrimmedSha256": "26d4cbd23b85e89a045f6061505b9a6b5922586109daa7386e6c44a09b2b0b78",
        "reason": "移除圆筒留声机启动、落针和曲终空转声；保留班卓琴起音及自然收尾。"
      }
    },
    {
      "deck": 1,
      "slide": 16,
      "sourceType": "video",
      "artist": "Scott Joplin",
      "artistKo": "스콧 조플린 · 斯科特·乔普林",
      "artistRole": "作曲家",
      "song": "Maple Leaf Rag",
      "songKo": "단풍잎 래그 · 枫叶拉格",
      "aliases": [
        "Maple leaf Rag"
      ],
      "year": 1899,
      "yearBasis": "课件的作品出版年 · 非留声机演示视频年份",
      "style": "ragtime",
      "versionLabel": "唱片留声机片段 · 第1讲第16页",
      "note": "视频对象名为 Improved Gramophone 2017 Maple Leaf Rag - Scott Joplin，画面为唱片留声机。保留原片段完整约31秒，不以补齐歌曲为由拼入其他录音。按第13页考作曲家 Scott Joplin、1899年及 Ragtime；对象名的2017不是作品年份。该唱片的演奏者和录音年没有可靠标注，保持未知。",
      "sources": [
        {
          "label": "美国国会图书馆：作品年份",
          "url": "https://www.loc.gov/collections/ragtime/articles-and-essays/history-of-ragtime/"
        }
      ],
      "id": "t52",
      "src": "audio/t52.mp3",
      "duration": 30.694
    },
    {
      "deck": 3,
      "slide": 6,
      "sourceType": "video",
      "artist": "Robert Johnson",
      "artistKo": "로버트 존슨 · 罗伯特·约翰逊",
      "artistRole": "歌手／创作音乐家",
      "song": "Cross Road Blues",
      "songKo": "교차로 블루스 · 十字路口蓝调",
      "aliases": [
        "Crossroads Blues",
        "Crossroads"
      ],
      "year": 1936,
      "yearBasis": "课件第5页标注的录音年份 · 非音乐视频制作年",
      "style": "country-blues",
      "versionLabel": "课件音乐视频音轨 · 第3讲第6页",
      "note": "第5页在 Country Blues／Folk Blues 段落明确列出 Robert Johnson 的 Cross Road Blues（1936）。第6页视频对象名和画面字幕指向同一作品。这里考1936年的作品录音，不将后制音乐视频的年代当作答案，也不把后来的 Crossroads 翻唱者当作本题音乐家。",
      "sources": [
        {
          "label": "Robert Johnson 基金会：音乐家及录音时期",
          "url": "https://www.robertjohnsonbluesfoundation.org/biography/"
        }
      ],
      "id": "t53",
      "src": "audio/t53.mp3?v=music-d0c045bec8ce",
      "duration": 149.394,
      "audioEdit": {
        "revision": 1,
        "start": 0.69,
        "end": 150.05,
        "fadeIn": 0.008,
        "fadeOut": 0.06,
        "untrimmedDuration": 158.014694,
        "untrimmedSha256": "0e75fae712531d58b275e1ee8131e28817d63159ab68845e5b058dd944e431d5",
        "reason": "移除音乐前短空白／独立瞬态及曲终长静音；保留吉他起音和衰减。"
      }
    },
    {
      "deck": 3,
      "slide": 14,
      "sourceType": "video",
      "artist": "윤심덕",
      "artistKo": "Yun Sim-deok · 尹心悳",
      "artistRole": "歌手／韩文填词者",
      "song": "사의 찬미",
      "songKo": "死의 讚美 · 死之赞美",
      "aliases": [
        "사 의 찬미",
        "死의 讚美",
        "사의찬미",
        "Hymn of Death",
        "In Praise of Death"
      ],
      "year": 1926,
      "yearBasis": "课件第13页标注的发表年份",
      "style": "changga",
      "versionLabel": "课件歌词视频音轨 · 第3讲第14页",
      "note": "第13页标注 윤심덕、사의 찬미（1926），为 Iosif Ivanovici《多瑙河之波》的改编；第14页视频对象名为 死의 讚美，画面题名一致。音乐家一栏考演唱者 윤심덕，不把原曲作曲者 Ivanovici 当作本题歌手。风格沿用本节“창가와 가요”中的外来曲调改编歌谣分类，不武断归为1930年代 Trot。韩国学中央研究院另确认1926年及改编歌谣性质。",
      "sources": [
        {
          "label": "韩国学中央研究院：作品、角色与1926年",
          "url": "https://encykorea.aks.ac.kr/Article/E0025885"
        }
      ],
      "id": "t54",
      "src": "audio/t54.mp3",
      "duration": 276.637
    },
    {
      "deck": 3,
      "slide": 15,
      "sourceType": "video",
      "artist": "이정숙",
      "artistKo": "Lee Jeong-suk · 李贞淑",
      "artistRole": "歌手",
      "song": "낙화유수",
      "songKo": "落花流水 · 강남달",
      "aliases": [
        "강남달",
        "江南月",
        "落花流水",
        "落花流水",
        "落花流水"
      ],
      "year": 1927,
      "yearBasis": "课件第13页的作品／电影年份 · 非唱片发行年",
      "style": "early-korean-song",
      "versionLabel": "课件歌词视频音轨 · 第3讲第15页",
      "note": "第13页标注 이정숙 演唱、김영환 作曲、낙화유수／강남달（1927）；第15页视频画面同时标出 이정숙 和 낙화유수。音乐家一栏考演唱者，不混入作曲者。按课件考1927年的作品年份；韩国学中央研究院区分1927年电影主题歌与1929年 이정숙 唱片发行，本题不将1927声称为当前音轨的录音日期。风格使用本节早期韩国创作歌谣分类，不将“3/4拍华尔兹”误写成 Trot。",
      "sources": [
        {
          "label": "韩国学中央研究院：别名及1927／1929口径",
          "url": "https://encykorea.aks.ac.kr/Article/E0011675"
        }
      ],
      "id": "t55",
      "src": "audio/t55.mp3?v=music-97461108deb9",
      "duration": 174.08,
      "audioEdit": {
        "revision": 1,
        "start": 0,
        "end": 174.05,
        "fadeIn": 0,
        "fadeOut": 0.06,
        "untrimmedDuration": 175.15102,
        "untrimmedSha256": "0c137d4eac814f1b6738c3dc4b53195ff728ecdd49d5ee917a2ac05d5c0f4419",
        "reason": "仅缩去音乐自然衰减之后的片尾空白，保留全部演唱。"
      }
    },
    {
      "deck": 6,
      "slide": 6,
      "sourceType": "video",
      "artist": "Elvis Presley",
      "artistKo": "엘비스 프레슬리 · 埃尔维斯·普雷斯利",
      "artistRole": "歌手",
      "song": "Hound Dog",
      "songKo": "하운드 도그 · 猎犬",
      "year": 1956,
      "yearBasis": "本现场版本的演出年份 · 非歌曲原唱年份",
      "style": "rock-roll",
      "versionLabel": "Ed Sullivan 现场 · 1956-10-28",
      "note": "第5页明确区分 Big Mama Thornton（1952）与 Elvis Presley（1956）的 Hound Dog。第6页视频对象标题注明 Elvis Presley、1956年10月28日、The Ed Sullivan Show；节目官方网站提供同一演出信息。这里考 Elvis 的摇滚现场版本1956，不与 Big Mama 的1952蓝调版本合并。听辨音轨已剪去节目介绍、报歌名、曲终后的独立掌声及对话，仅保留同一场现场歌曲；原始完整音轨已备份，未替换成其他录音。",
      "sources": [
        {
          "label": "Ed Sullivan 官方：1956-10-28 Hound Dog 演出",
          "url": "https://www.edsullivan.com/elvis-three-appearances-on-the-ed-sullivan-show-watch-history-in-the-making-and-from-the-waist-up-1956/"
        }
      ],
      "id": "t56",
      "src": "audio/t56.mp3?v=music-b30dfb4416ca",
      "duration": 93.544,
      "audioEdit": {
        "revision": 1,
        "start": 64.7,
        "end": 158.2,
        "fadeIn": 0.012,
        "fadeOut": 0.1,
        "untrimmedDuration": 217.364898,
        "untrimmedSha256": "cfe8f412e699fa238c0b9bcf3005dfcbb2628c870716a52243447c67affd1143",
        "reason": "去除节目介绍、报歌名、音乐结束后的独立掌声及主持对话；保留现场歌曲及结束音。"
      }
    },
    {
      "slide": 4,
      "artist": "The Beatles",
      "artistKo": "비틀스 · 披头士",
      "artistAliases": [
        "Beatles"
      ],
      "song": "I Want to Hold Your Hand",
      "songKo": "네 손을 잡고 싶어 · 我想握住你的手",
      "year": 1964,
      "style": "rock",
      "yearBasis": "课件第4页的美国榜单登顶年 · 非首次发行年",
      "note": "课件以1964年美国榜单第一名讲解英国入侵；按该课程口径考1964，不把2015重制年份作为作品年份。 内嵌标签“Odeurs / I Want to Hold Your Hand”与课件“The Beatles / I Want to Hold Your Hand”不一致。标签可能误填，实际声音对应关系尚未确认；按课件知识评分，支持跳过此题。",
      "sources": [
        {
          "label": "披头士官网：1963年首次发行",
          "url": "https://www.thebeatles.com/i-want-hold-your-hand-0"
        }
      ],
      "id": "t57",
      "deck": 7,
      "sourceType": "audio",
      "src": "audio/t57.mp3",
      "duration": 145.711,
      "artistRole": "演唱者／乐队",
      "versionLabel": "第7讲第4页 · 课件音频",
      "uncertainAudio": true,
      "discrepancy": "内嵌标签“Odeurs / I Want to Hold Your Hand”与课件“The Beatles / I Want to Hold Your Hand”不一致。",
      "releaseYear": 1963,
      "releaseYearBasis": "本演唱者版本首次发行年；与课件评分年独立存储，非原作或重制年",
      "originalTitle": "네 손을 잡고 싶어 I Want to Hold Your Hand",
      "albumIds": []
    },
    {
      "slide": 4,
      "artist": "The Beatles",
      "artistKo": "비틀스 · 披头士",
      "artistAliases": [
        "Beatles"
      ],
      "song": "Yesterday",
      "songKo": "예스터데이 · 昨日",
      "year": 1965,
      "style": "rock",
      "note": "年份按第4页作品年份1965，风格沿用本节从摇滚乐到摇滚的课程分类。录音重制年2015不参与年份评分。 内嵌标签“101 / Yesterday”与课件“The Beatles / Yesterday”不一致。标签可能误填，实际声音对应关系尚未确认；按课件知识评分，支持跳过此题。",
      "id": "t58",
      "deck": 7,
      "sourceType": "audio",
      "src": "audio/t58.mp3",
      "duration": 125.256,
      "artistRole": "演唱者／乐队",
      "yearBasis": "第七讲课件的本版本歌曲／专辑年份 · 非数字重制年",
      "versionLabel": "第7讲第4页 · 课件音频",
      "uncertainAudio": true,
      "discrepancy": "内嵌标签“101 / Yesterday”与课件“The Beatles / Yesterday”不一致。",
      "releaseYear": 1965,
      "releaseYearBasis": "本演唱者版本首次发行年；与课件评分年独立存储，非原作或重制年",
      "originalTitle": "예스터데이 Yesterday",
      "albumIds": []
    },
    {
      "slide": 4,
      "artist": "The Beatles",
      "artistKo": "비틀스 · 披头士",
      "artistAliases": [
        "Beatles"
      ],
      "song": "Eleanor Rigby",
      "songKo": "엘리너 리그비 · 埃莉诺·里格比",
      "year": 1966,
      "style": "rock",
      "note": "第4页明确标注1966；考演唱乐队The Beatles，不以制作人George Martin代替演唱者。",
      "sources": [
        {
          "label": "披头士官网：1966年发行",
          "url": "https://www.thebeatles.com/eleanor-rigby"
        }
      ],
      "id": "t59",
      "deck": 7,
      "sourceType": "audio",
      "src": "audio/t59.mp3",
      "duration": 125.784,
      "artistRole": "演唱者／乐队",
      "yearBasis": "第七讲课件的本版本歌曲／专辑年份 · 非数字重制年",
      "versionLabel": "第7讲第4页 · 课件音频",
      "releaseYear": 1966,
      "releaseYearBasis": "本演唱者版本首次发行年；与课件评分年独立存储，非原作或重制年",
      "originalTitle": "엘리너 리그비 Eleanor Rigby",
      "albumIds": []
    },
    {
      "slide": 5,
      "artist": "The Beatles",
      "artistKo": "비틀스 · 披头士",
      "artistAliases": [
        "Beatles"
      ],
      "song": "Sgt. Pepper's Lonely Hearts Club Band",
      "songKo": "페퍼 상사의 론리 하트클럽 밴드 · 佩珀军士的孤独之心俱乐部乐队",
      "aliases": [
        "Sgt Pepper's Lonely Hearts Club Band",
        "Sgt. Pepper’s Lonely Heart Club Band"
      ],
      "year": 1967,
      "style": "psychedelic-rock",
      "note": "音频对象指向同名歌曲；同名歌曲与专辑均于1967年发行，分别记录；不从专辑年份推断其他歌曲年份。第5页明确讨论迷幻、反文化与概念专辑。规范英文标题Hearts拼写，保留课件Heart拼写为别名。 内嵌标签“DJ Deep / Sgt. Pepper's Lonely Hearts Club Band”与课件“The Beatles / Sgt. Pepper's Lonely Hearts Club Band”不一致。标签可能误填，实际声音对应关系尚未确认；按课件知识评分，支持跳过此题。",
      "id": "t60",
      "deck": 7,
      "sourceType": "audio",
      "src": "audio/t60.mp3",
      "duration": 122.854,
      "artistRole": "演唱者／乐队",
      "yearBasis": "第七讲课件的本版本歌曲／专辑年份 · 非数字重制年",
      "versionLabel": "第7讲第5页 · 课件音频",
      "uncertainAudio": true,
      "discrepancy": "内嵌标签“DJ Deep / Sgt. Pepper's Lonely Hearts Club Band”与课件“The Beatles / Sgt. Pepper's Lonely Hearts Club Band”不一致。",
      "releaseYear": 1967,
      "releaseYearBasis": "本演唱者版本首次发行年；与课件评分年独立存储，非原作或重制年",
      "originalTitle": "페퍼 상사의 론리 하트클럽 밴드 Sgt. Pepper’s Lonely Heart Club Band",
      "albumIds": [
        "sgt-pepper"
      ],
      "sources": [
        {
          "label": "The Beatles官方：1967年专辑",
          "url": "https://www.thebeatles.com/otd-1967-uk-lp-sgt-peppers-lonely-hearts-club-band-was-released"
        }
      ]
    },
    {
      "slide": 6,
      "artist": "The Beach Boys",
      "artistKo": "비치 보이스 · 海滩男孩",
      "artistAliases": [
        "Beach Boys"
      ],
      "song": "Surfin' U.S.A.",
      "songKo": "서핑 USA · 冲浪美国",
      "aliases": [
        "Surfin USA",
        "Surfin' USA"
      ],
      "year": 1963,
      "style": "rock-roll",
      "note": "第6页明确标注1963及로큰롤。音乐家考演唱乐队The Beach Boys，Brian Wilson的创作／制作角色写在课件背景，不作为本题唯一演唱者。",
      "id": "t61",
      "deck": 7,
      "sourceType": "audio",
      "src": "audio/t61.mp3",
      "duration": 149.328,
      "artistRole": "演唱者／乐队",
      "yearBasis": "第七讲课件的本版本歌曲／专辑年份 · 非数字重制年",
      "versionLabel": "第7讲第6页 · 课件音频",
      "releaseYear": 1963,
      "releaseYearBasis": "本演唱者版本首次发行年；与课件评分年独立存储，非原作或重制年",
      "originalTitle": "서핑 USA Surfin’ USA",
      "albumIds": []
    },
    {
      "slide": 6,
      "artist": "The Beach Boys",
      "artistKo": "비치 보이스 · 海滩男孩",
      "artistAliases": [
        "Beach Boys"
      ],
      "song": "Good Vibrations",
      "songKo": "멋진 진동 · 美好振动",
      "aliases": [
        "Good Vibration"
      ],
      "year": 1966,
      "style": "rock",
      "note": "第6页标注1966，按本节摇滚的课程大类训练；课件单数good Vibration保留为别名，规范歌名为Good Vibrations。 内嵌标签“FM / Good Vibrations”与课件“The Beach Boys / Good Vibrations”不一致。标签可能误填，实际声音对应关系尚未确认；按课件知识评分，支持跳过此题。",
      "sources": [
        {
          "label": "海滩男孩官网：1966年单曲",
          "url": "https://thebeachboys.com/blogs/news/good-vibrations-turns-60"
        }
      ],
      "id": "t62",
      "deck": 7,
      "sourceType": "audio",
      "src": "audio/t62.mp3",
      "duration": 217.731,
      "artistRole": "演唱者／乐队",
      "yearBasis": "第七讲课件的本版本歌曲／专辑年份 · 非数字重制年",
      "versionLabel": "第7讲第6页 · 课件音频",
      "uncertainAudio": true,
      "discrepancy": "内嵌标签“FM / Good Vibrations”与课件“The Beach Boys / Good Vibrations”不一致。",
      "releaseYear": 1966,
      "releaseYearBasis": "本演唱者版本首次发行年；与课件评分年独立存储，非原作或重制年",
      "originalTitle": "멋진 진동 good Vibration",
      "albumIds": []
    },
    {
      "slide": 7,
      "artist": "The Rolling Stones",
      "artistKo": "롤링 스톤스 · 滚石乐队",
      "artistAliases": [
        "Rolling Stones"
      ],
      "song": "(I Can't Get No) Satisfaction",
      "songKo": "만족 (할 수 없어요) · 满足",
      "aliases": [
        "Satisfaction",
        "I Can't Get No Satisfaction"
      ],
      "year": 1965,
      "style": "rock",
      "note": "第7页标注1965；本节说明乐队受早期摇滚乐及芝加哥电声蓝调影响，风格按课程大类Rock训练。",
      "id": "t63",
      "deck": 7,
      "sourceType": "audio",
      "src": "audio/t63.mp3",
      "duration": 234.815,
      "artistRole": "演唱者／乐队",
      "yearBasis": "第七讲课件的本版本歌曲／专辑年份 · 非数字重制年",
      "versionLabel": "第7讲第7页 · 课件音频",
      "releaseYear": 1965,
      "releaseYearBasis": "本演唱者版本首次发行年；与课件评分年独立存储，非原作或重制年",
      "originalTitle": "만족 (할 수 없어요) (I Can’t Get No) Satisfaction",
      "albumIds": []
    },
    {
      "slide": 7,
      "artist": "The Rolling Stones",
      "artistKo": "롤링 스톤스 · 滚石乐队",
      "artistAliases": [
        "Rolling Stones"
      ],
      "song": "Paint It Black",
      "songKo": "검은색으로 칠해 · 漆成黑色",
      "aliases": [
        "Paint It, Black"
      ],
      "year": 1966,
      "style": "rock",
      "note": "第7页明确标注1966；按课件摇滚分类，不把歌词视频发布年份当作歌曲年份。",
      "id": "t64",
      "deck": 7,
      "sourceType": "audio",
      "src": "audio/t64.mp3",
      "duration": 226.273,
      "artistRole": "演唱者／乐队",
      "yearBasis": "第七讲课件的本版本歌曲／专辑年份 · 非数字重制年",
      "versionLabel": "第7讲第7页 · 课件音频",
      "releaseYear": 1966,
      "releaseYearBasis": "本演唱者版本首次发行年；与课件评分年独立存储，非原作或重制年",
      "originalTitle": "검은색으로 칠해 Paint it Black",
      "albumIds": []
    },
    {
      "slide": 8,
      "artist": "Jefferson Airplane",
      "artistKo": "제퍼슨 에어플레인 · 杰斐逊飞机",
      "song": "Somebody to Love",
      "songKo": "사랑할 누구 · 寻找爱人",
      "year": 1967,
      "style": "rock",
      "note": "第8页在旧金山摇滚段落列出Jefferson Airplane与专辑Surrealistic Pillow（1967）。考本乐队版本，避免与其他同名歌曲或原作版本混淆。 内嵌标签“Ed / Somebody to Love”与课件“Jefferson Airplane / Somebody to Love”不一致。标签可能误填，实际声音对应关系尚未确认；按课件知识评分，支持跳过此题。 本乐队歌曲版本发行年1967单独记录，不以专辑年份替代歌曲发行年份。",
      "id": "t65",
      "deck": 7,
      "sourceType": "audio",
      "src": "audio/t65.mp3",
      "duration": 174.768,
      "artistRole": "演唱者／乐队",
      "yearBasis": "第七讲课件的本版本歌曲／专辑年份 · 非数字重制年",
      "versionLabel": "第7讲第8页 · 课件音频",
      "uncertainAudio": true,
      "discrepancy": "内嵌标签“Ed / Somebody to Love”与课件“Jefferson Airplane / Somebody to Love”不一致。",
      "releaseYear": 1967,
      "releaseYearBasis": "本演唱者版本首次发行年；与课件评分年独立存储，非原作或重制年",
      "originalTitle": "사랑할 누구 Somebody to Love",
      "albumIds": [
        "surrealistic-pillow"
      ],
      "sources": [
        {
          "label": "乐队官网：1967年3月单曲发行",
          "url": "https://jeffersonairplane.com/timeline_slider_post/1967/"
        }
      ]
    },
    {
      "slide": 8,
      "artist": "Janis Joplin",
      "artistKo": "재니스 조플린 · 贾尼斯·乔普林",
      "artistAliases": [
        "Big Brother & the Holding Company",
        "Big Brother and the Holding Company",
        "Big Brother & the Holding Company, Janis Joplin"
      ],
      "song": "Summertime",
      "songKo": "서머타임 · 夏日时光",
      "year": 1968,
      "style": "rock",
      "note": "第8页为Janis Joplin演唱、Big Brother & the Holding Company《Cheap Thrills》（1968）版本。音乐家接受主唱Janis Joplin或乐队；年份考本版本1968，非Gershwin原作1930年代。 内嵌标签“Big Brother & the Holding Company / Hall of the Mountain King”与课件“Janis Joplin / Summertime”不一致。标签可能误填，实际声音对应关系尚未确认；按课件知识评分，支持跳过此题。",
      "id": "t66",
      "deck": 7,
      "sourceType": "audio",
      "src": "audio/t66.mp3",
      "duration": 241.32,
      "artistRole": "主唱",
      "yearBasis": "第七讲课件的本版本歌曲／专辑年份 · 非数字重制年",
      "versionLabel": "第7讲第8页 · 课件音频",
      "uncertainAudio": true,
      "discrepancy": "内嵌标签“Big Brother & the Holding Company / Hall of the Mountain King”与课件“Janis Joplin / Summertime”不一致。",
      "releaseYear": 1968,
      "releaseYearBasis": "本演唱者版本首次发行年；与课件评分年独立存储，非原作或重制年",
      "originalTitle": "서머타임 Summertime",
      "albumIds": [
        "cheap-thrills"
      ]
    },
    {
      "slide": 8,
      "artist": "The Doors",
      "artistKo": "도어스 · 大门乐队",
      "artistAliases": [
        "Doors"
      ],
      "song": "Light My Fire",
      "songKo": "내 불을 밝혀줘 · 点燃我的火",
      "year": 1967,
      "style": "rock",
      "note": "第8页明确标注同名专辑The Doors（1967）；题库保留课件约7分钟长版本，避免用另一段短单曲替换。 本乐队歌曲版本发行年1967单独记录，专辑信息另列。",
      "id": "t67",
      "deck": 7,
      "sourceType": "audio",
      "src": "audio/t67.mp3",
      "duration": 418.194,
      "artistRole": "演唱者／乐队",
      "yearBasis": "第七讲课件的本版本歌曲／专辑年份 · 非数字重制年",
      "versionLabel": "第7讲第8页 · 课件音频",
      "releaseYear": 1967,
      "releaseYearBasis": "本演唱者版本首次发行年；与课件评分年独立存储，非原作或重制年",
      "originalTitle": "내 불을 밝혀줘 Light My Fire",
      "albumIds": [
        "the-doors"
      ],
      "sources": [
        {
          "label": "The Doors官方：1967年歌曲与专辑",
          "url": "https://thedoors.com/music"
        }
      ]
    },
    {
      "slide": 9,
      "artist": "The Temptations",
      "artistKo": "템프테이션 · 诱惑合唱团",
      "artistAliases": [
        "Temptations",
        "템프테이션스"
      ],
      "song": "My Girl",
      "songKo": "마이 걸 · 我的女孩",
      "year": 1965,
      "style": "soul",
      "yearBasis": "课件第9页的美国榜单登顶年 · 非单曲首次发行年",
      "note": "课件标1965，Motown Museum亦以1965年首次流行榜冠军叙述；官方乐队资料区分1964年12月单曲发行。本题按课程口径考1965。 内嵌标签“GARZI / My Temptations”与课件“The Temptations / My Girl”不一致。标签可能误填，实际声音对应关系尚未确认；按课件知识评分，支持跳过此题。",
      "sources": [
        {
          "label": "Motown Museum：1965年登顶",
          "url": "https://www.motownmuseum.org/artist/temptations/"
        },
        {
          "label": "乐队官网：1964年底发行",
          "url": "https://www.temptationsofficial.com/my-girl-see-cast-broadways-aint-too-proud-sing-temptations-hit-nyc-subways/"
        }
      ],
      "id": "t68",
      "deck": 7,
      "sourceType": "audio",
      "src": "audio/t68.mp3",
      "duration": 164.448,
      "artistRole": "演唱者／乐队",
      "versionLabel": "第7讲第9页 · 课件音频",
      "uncertainAudio": true,
      "discrepancy": "内嵌标签“GARZI / My Temptations”与课件“The Temptations / My Girl”不一致。",
      "releaseYear": 1964,
      "releaseYearBasis": "本演唱者版本首次发行年；与课件评分年独立存储，非原作或重制年",
      "originalTitle": "마이 걸 My Girl",
      "albumIds": []
    },
    {
      "slide": 9,
      "artist": "The Supremes",
      "artistKo": "슈프림스 · 至上女声",
      "artistAliases": [
        "Supremes"
      ],
      "song": "You Can't Hurry Love",
      "songKo": "서둘러 사랑할 순 없어 · 爱情急不得",
      "year": 1966,
      "style": "soul",
      "note": "第9页在Motown／Soul段落明确列出The Supremes版本及1966；不混入Phil Collins或其他翻唱版本。 内嵌标签“田村直美 / You Can't Hurry Love”与课件“The Supremes / You Can't Hurry Love”不一致。标签可能误填，实际声音对应关系尚未确认；按课件知识评分，支持跳过此题。",
      "id": "t69",
      "deck": 7,
      "sourceType": "audio",
      "src": "audio/t69.mp3",
      "duration": 167.856,
      "artistRole": "演唱者／乐队",
      "yearBasis": "第七讲课件的本版本歌曲／专辑年份 · 非数字重制年",
      "versionLabel": "第7讲第9页 · 课件音频",
      "uncertainAudio": true,
      "discrepancy": "内嵌标签“田村直美 / You Can't Hurry Love”与课件“The Supremes / You Can't Hurry Love”不一致。",
      "releaseYear": 1966,
      "releaseYearBasis": "本演唱者版本首次发行年；与课件评分年独立存储，非原作或重制年",
      "originalTitle": "서둘러 사랑할 순 없어 You Can’t Hurry Love",
      "albumIds": []
    },
    {
      "slide": 10,
      "artist": "Ray Charles",
      "artistKo": "레이 찰스 · 雷·查尔斯",
      "song": "Georgia on My Mind",
      "songKo": "내 마음의 조지아 · 我心中的乔治亚",
      "year": 1960,
      "style": "tin-pan-alley-song",
      "note": "第10页把这首歌作为Ray Charles进入Tin Pan Alley曲目领域的例子，年份为该歌手1960年版本。本题风格采用课程的Tin Pan Alley曲目分类，不因歌手被称为灵魂乐先驱便将所有歌曲统一归为Soul。该分类不要求其演唱属于Crooner唱法。 内嵌标签“Hugh K / Georgia On My Mind (Georgia)”与课件“Ray Charles / Georgia on My Mind”不一致。标签可能误填，实际声音对应关系尚未确认；按课件知识评分，支持跳过此题。",
      "id": "t70",
      "deck": 7,
      "sourceType": "audio",
      "src": "audio/t70.mp3",
      "duration": 222.168,
      "artistRole": "演唱者／乐队",
      "yearBasis": "第七讲课件的本版本歌曲／专辑年份 · 非数字重制年",
      "versionLabel": "第7讲第10页 · 课件音频",
      "uncertainAudio": true,
      "discrepancy": "内嵌标签“Hugh K / Georgia On My Mind (Georgia)”与课件“Ray Charles / Georgia on My Mind”不一致。",
      "releaseYear": 1960,
      "releaseYearBasis": "本演唱者版本首次发行年；与课件评分年独立存储，非原作或重制年",
      "originalTitle": "내 마음의 조지아 Georgia on My Mind",
      "albumIds": []
    },
    {
      "slide": 10,
      "artist": "Ray Charles",
      "artistKo": "레이 찰스 · 雷·查尔斯",
      "song": "I Can't Stop Loving You",
      "songKo": "사랑을 멈출 수 없어요 · 我无法停止爱你",
      "year": 1962,
      "style": "country-western",
      "note": "第10页明确作为Ray Charles演唱Country Song的例子（1962）。年份为本歌手版本，非原作发行年；风格按课件曲目分类Country训练。 内嵌标签“Ike & Tina Turner / I Can't Stop Loving You”与课件“Ray Charles / I Can't Stop Loving You”不一致。标签可能误填，实际声音对应关系尚未确认；按课件知识评分，支持跳过此题。",
      "id": "t71",
      "deck": 7,
      "sourceType": "audio",
      "src": "audio/t71.mp3",
      "duration": 256.056,
      "artistRole": "演唱者／乐队",
      "yearBasis": "第七讲课件的本版本歌曲／专辑年份 · 非数字重制年",
      "versionLabel": "第7讲第10页 · 课件音频",
      "uncertainAudio": true,
      "discrepancy": "内嵌标签“Ike & Tina Turner / I Can't Stop Loving You”与课件“Ray Charles / I Can't Stop Loving You”不一致。",
      "releaseYear": 1962,
      "releaseYearBasis": "本演唱者版本首次发行年；与课件评分年独立存储，非原作或重制年",
      "originalTitle": "사랑을 멈출 수 없어요 I Can’t Stop Loving You",
      "albumIds": []
    },
    {
      "slide": 11,
      "artist": "James Brown",
      "artistKo": "제임스 브라운 · 詹姆斯·布朗",
      "song": "Say It Loud – I'm Black and I'm Proud",
      "songKo": "크게 말해 난 흑인이고 그것이 자랑스럽다고 · 大声说我身为黑人而骄傲",
      "aliases": [
        "Say It Loud I'm Black and I'm Proud",
        "Say It Loud - I'm Black and I'm Proud (Pt. 1)",
        "Say It Loud"
      ],
      "year": 1968,
      "style": "soul",
      "note": "第11页标1968；风格按本讲Soul段落训练，课件同时强调其重复节奏、多重节奏与后来Funk的发展。片段为Part 1，不要求填写分段编号。",
      "id": "t72",
      "deck": 7,
      "sourceType": "audio",
      "src": "audio/t72.mp3",
      "duration": 167.352,
      "artistRole": "演唱者／乐队",
      "yearBasis": "第七讲课件的本版本歌曲／专辑年份 · 非数字重制年",
      "versionLabel": "第7讲第11页 · 课件音频",
      "releaseYear": 1968,
      "releaseYearBasis": "本演唱者版本首次发行年；与课件评分年独立存储，非原作或重制年",
      "originalTitle": "크게 말해- 난 흑인이고 그것이 자랑스럽다고 Say it Loud- I’m Black and I’m Proud",
      "albumIds": []
    },
    {
      "slide": 12,
      "artist": "James Brown",
      "artistKo": "제임스 브라운 · 詹姆斯·布朗",
      "song": "Papa's Got a Brand New Bag",
      "songKo": "아빠가 신상품을 샀어 · 爸爸有了新玩意",
      "aliases": [
        "Papa Got a Brand New Bag",
        "Papa's Got A Brand New Bag"
      ],
      "year": 1965,
      "style": "soul",
      "yearBasis": "课件第11页的歌曲年份 · 现场拍摄日期未独立确认",
      "versionLabel": "课件James Brown现场视频音轨 · 第7讲第12页",
      "note": "第11页给出歌曲及1965，第12页视频对象名亦标James Brown与1965。以课程歌曲年份评分，不把尚未独立确认的演出时间作为事实。保留原现场连续音轨；画面抽查有同一舞台表演，未进行逐秒听审，未凭静音检测猜切音乐边界。 风格依据为第9页起的“R&B에서 소울(Soul) 로”章节；第11页为其中的James Brown段落。年份、艺人、风格均有课件依据，因此保留听辨题。",
      "sources": [
        {
          "label": "James Brown官网：1965年作品",
          "url": "https://jamesbrown.com/pages/the-legacy"
        }
      ],
      "id": "t73",
      "deck": 7,
      "sourceType": "video",
      "src": "audio/t73.mp3",
      "duration": 178.338,
      "artistRole": "演唱者／乐队",
      "releaseYear": null,
      "releaseYearBasis": "歌曲于1965年发行；本现场录音的演出及发行时间未独立确认",
      "originalTitle": "아빠가 신상품을 샀어 Papa Got a Brand New Bag",
      "albumIds": [],
      "songReleaseYear": 1965,
      "courseEvidence": {
        "id": "t73",
        "included": true,
        "artist": {
          "page": 11,
          "original": "(3) 제임스 브라운(1933~2006)"
        },
        "year": {
          "page": 11,
          "original": "<아빠가 신상품을 샀어 Papa Got a Brand New Bag> (1965)"
        },
        "style": {
          "page": 9,
          "original": "2) R&B에서 소울(Soul) 로",
          "scope": "第9–13页Soul章节；第11页为其中的James Brown段落"
        },
        "video": {
          "page": 12,
          "objectName": "James Brown - Papa's Got A Brand New Bag Live 1965 (Remasterted)"
        },
        "yearBasis": "1965为课件明确给出的歌曲年份，不认定为已独立核实的现场日期"
      }
    },
    {
      "slide": 13,
      "artist": "Aretha Franklin",
      "artistKo": "아레사 프랭클린 · 艾瑞莎·弗兰克林",
      "song": "Respect",
      "songKo": "존중하라 · 尊重",
      "year": 1967,
      "style": "soul",
      "note": "第13页明确Aretha Franklin版本及1967。考本歌手版本，非Otis Redding原作版本年份。",
      "id": "t74",
      "deck": 7,
      "sourceType": "audio",
      "src": "audio/t74.mp3",
      "duration": 148.656,
      "artistRole": "演唱者／乐队",
      "yearBasis": "第七讲课件的本版本歌曲／专辑年份 · 非数字重制年",
      "versionLabel": "第7讲第13页 · 课件音频",
      "releaseYear": 1967,
      "releaseYearBasis": "本演唱者版本首次发行年；与课件评分年独立存储，非原作或重制年",
      "originalTitle": "존중하라 Respect",
      "albumIds": []
    },
    {
      "slide": 15,
      "artist": "Cream",
      "artistKo": "크림 · 奶油乐队",
      "artistAliases": [
        "The Cream"
      ],
      "song": "Sunshine of Your Love",
      "songKo": "사랑의 햇살 · 你爱的阳光",
      "year": 1967,
      "style": "rock",
      "note": "第14–15页把Cream放在摇滚乐与蓝调结合的吉他英雄段落，歌曲标1967。音乐家考乐队Cream，Eric Clapton为其中的吉他手，不将独奏者角色代替整个乐队。",
      "id": "t75",
      "deck": 7,
      "sourceType": "audio",
      "src": "audio/t75.mp3",
      "duration": 250.044,
      "artistRole": "演唱者／乐队",
      "yearBasis": "第七讲课件的本版本歌曲／专辑年份 · 非数字重制年",
      "versionLabel": "第7讲第15页 · 课件音频",
      "releaseYear": 1967,
      "releaseYearBasis": "本演唱者版本首次发行年；与课件评分年独立存储，非原作或重制年",
      "originalTitle": "사랑의 햇살 Sunshine of Your Love",
      "albumIds": [],
      "sources": [
        {
          "label": "Cream官网：歌曲发行1967",
          "url": "https://www.creambandofficial.com/singles/sunshine-of-your-love"
        }
      ]
    },
    {
      "slide": 15,
      "artist": "The Jimi Hendrix Experience",
      "artistKo": "지미 헨드릭스 익스피리언스 · 吉米·亨德里克斯体验乐队",
      "artistAliases": [
        "Jimi Hendrix",
        "지미 헨드릭스",
        "吉米·亨德里克斯",
        "Jimi Hendrix Experience"
      ],
      "song": "Purple Haze",
      "songKo": "보라색 안개 · 紫雾",
      "year": 1967,
      "style": "rock",
      "note": "第14和15页均明确1967，实际音频对象在第15页。音乐家接受The Jimi Hendrix Experience或主唱／吉他手Jimi Hendrix，风格沿用课程Rock分类。",
      "id": "t76",
      "deck": 7,
      "sourceType": "audio",
      "src": "audio/t76.mp3",
      "duration": 172.382,
      "artistRole": "演唱者／乐队",
      "yearBasis": "第七讲课件的本版本歌曲／专辑年份 · 非数字重制年",
      "versionLabel": "第7讲第15页 · 课件音频",
      "releaseYear": 1967,
      "releaseYearBasis": "本演唱者版本首次发行年；与课件评分年独立存储，非原作或重制年",
      "originalTitle": "보라색 안개 Purple Haze",
      "albumIds": []
    },
    ...lecture8Tracks,
    ...lecture9Tracks
  ],
  "audit": {
    "date": "2026-11-27",
    "decks": 9,
    "slides": 125,
    "audio_objects": 91,
    "video_objects": 10,
    "exported_audio_files": 101,
    "training_versions": 100,
    "unresolved_audio_labels": 19,
    "lecture8_year_conflicts": 2,
    "external_links": 0,
    "unreferenced_media": 0
  },
  "course7": {
    "title": "7강: 1960년대 대중음악 (1) — 록과 소울",
    "audioCount": 20,
    "albums": [
      {
        "id": "sgt-pepper",
        "title": "Sgt. Pepper's Lonely Hearts Club Band",
        "original": "페퍼 상사의 론리 하트클럽 밴드 / Sgt. Pepper’s Lonely Heart Club Band",
        "artist": "The Beatles",
        "year": 1967,
        "page": 5,
        "tracks": [
          "t60"
        ],
        "note": "课件讨论迷幻、反文化、概念专辑和录音室制作；正文中的800万销量为课件原文口径，未作为当前累计销量。",
        "source": "https://www.thebeatles.com/otd-1967-uk-lp-sgt-peppers-lonely-hearts-club-band-was-released",
        "cover": "assets/course7-sgt-pepper.svg"
      },
      {
        "id": "pet-sounds",
        "title": "Pet Sounds",
        "original": "펫 사운드 / Pet Sound",
        "artist": "The Beach Boys",
        "year": 1966,
        "page": 6,
        "tracks": [],
        "note": "Brian Wilson 的创作与制作角色。Good Vibrations 并未收录于1966年原版 Pet Sounds；两者同年且在同页讨论，不等于收录关系。课件将概念专辑概念归于Wilson的说法作为课程观点保留，不认定为唯一发明者。",
        "source": "https://thebeachboys.com/blogs/news/good-vibrations-turns-60",
        "cover": "assets/course7-pet-sounds.svg"
      },
      {
        "id": "surrealistic-pillow",
        "title": "Surrealistic Pillow",
        "original": "초현실적 베개 / Surrealistic Pillow",
        "artist": "Jefferson Airplane",
        "year": 1967,
        "page": 8,
        "tracks": [
          "t65"
        ],
        "note": "旧金山反文化与迷幻摇滚背景；Somebody to Love 为本乐队版本，不混用同名歌曲或原唱版本。",
        "source": "https://jeffersonairplane.com/",
        "cover": "assets/course7-surrealistic-pillow.svg"
      },
      {
        "id": "the-doors",
        "title": "The Doors",
        "original": "도어스 / The Doors",
        "artist": "The Doors",
        "year": 1967,
        "page": 8,
        "tracks": [
          "t67"
        ],
        "note": "同名首张专辑；Light My Fire 保留课件长版音频，不用剪短单曲替换。",
        "source": "https://thedoors.com/music",
        "cover": "assets/course7-the-doors.svg"
      },
      {
        "id": "cheap-thrills",
        "title": "Cheap Thrills",
        "original": "싸구려 흥분 / Cheap Thrills",
        "artist": "Big Brother & the Holding Company · 主唱 Janis Joplin",
        "year": 1968,
        "page": 8,
        "tracks": [
          "t66"
        ],
        "note": "Summertime 对应1968年乐队与主唱的版本，非Gershwin原作年份。",
        "source": "https://janisjoplin.com/album/cheap-thrills/",
        "cover": "assets/course7-cheap-thrills.svg"
      }
    ],
    "background": [
      {
        "pages": [
          2,
          3
        ],
        "title": "1960年代：民权、战争与反文化",
        "text": "课件时间线：1960 Kennedy 当选；1961就职、越战介入；1963华盛顿大游行、Martin Luther King演说、Kennedy遇刺；1965 Selma–Montgomery游行与Malcolm X遇刺；1966中国文化大革命；1967 Che Guevara在玻利维亚遇害；1968 King遇刺、法国五月运动、Nixon当选。婴儿潮一代推动反文化，反帝国主义和种族歧视，倡导共同体、自由生活与性别平等；大麻与LSD的流行也影响音乐。"
      },
      {
        "pages": [
          4,
          5
        ],
        "title": "The Beatles：从 Rock ’n’ Roll 到录音室实验",
        "text": "1960年利物浦成团。John Lennon、Paul McCartney、George Harrison、Ringo Starr；1962年与制作人George Martin合作。英国入侵以1964年美国成功为节点。成员间协作与Martin的制作推动1960年代中期的演变，Sgt. Pepper’s用于讨论迷幻、反文化、概念专辑及录音室制作。制作人不等同于歌曲演唱者。"
      },
      {
        "pages": [
          6
        ],
        "title": "Brian Wilson 与 The Beach Boys",
        "text": "1961年以Brian Wilson为核心在加州成团，继承1950年代摇滚乐，又发展独特和声与声音制作；Wilson兼任创作者和制作人。Pet Sounds 是专辑，Surfin’ U.S.A.与Good Vibrations是歌曲；同页出现不能自动建立专辑收录关系。"
      },
      {
        "pages": [
          7
        ],
        "title": "The Rolling Stones 与芝加哥电声蓝调",
        "text": "1962年伦敦成团。课件列出Mick Jagger、Keith Richards、Brian Jones、Bill Wyman、Charlie Watts。除早期摇滚乐外，1950年代芝加哥电声蓝调是关键影响。"
      },
      {
        "pages": [
          8
        ],
        "title": "旧金山场景与西海岸摇滚",
        "text": "旧金山作为嬉皮与反文化中心；课件借Tom Donahue、电台与Fillmore讲述另类音乐传播。Jefferson Airplane关联旧金山；The Doors是1965年在洛杉矶成立的乐队，并非旧金山乐队；Janis Joplin演唱与Big Brother & the Holding Company的录音须保留版本归属。电台与场馆原文有待校正，见下方映射。"
      },
      {
        "pages": [
          9
        ],
        "title": "Motown：Berry Gordy 的制作体系",
        "text": "Berry Gordy（1929年生）1959年在Detroit创立Motown，以黑人音乐为基础进入主流青年市场；制作与艺人管理严格，课件将其与Phil Spector比较。Holland–Dozier–Holland创作／制作体系，以及The Temptations、The Supremes、Marvin Gaye、Jackson Five、Stevie Wonder均为本页考点；后3位／组仅作艺人背景，正文没有为其另列歌曲。"
      },
      {
        "pages": [
          10
        ],
        "title": "Ray Charles：跨越 R&B、Tin Pan Alley 与 Country",
        "text": "1930年生于Georgia州Albany，2004年去世。1950年代已在黑人音乐市场成名，1960年代通过Georgia on My Mind和I Can’t Stop Loving You跨入流行榜。课件将两曲分别作为Tin Pan Alley曲目与Country Song例子；歌手的Soul身份不等于所有曲目采用相同风格答案。"
      },
      {
        "pages": [
          11,
          12
        ],
        "title": "James Brown：节奏、Funk 与黑人认同",
        "text": "1933–2006，South Carolina出生；称号包括“灵魂乐教父”“Mr. Dynamite”“Soul Brother No.1”。喊唱、缩减旋律、反复词句与多重节奏，推动Funk发展。Say It Loud体现黑人民权与身份认同；Papa’s Got a Brand New Bag正文在第11页，现场视频在第12页，现场日期未独立确认。"
      },
      {
        "pages": [
          13
        ],
        "title": "Aretha Franklin：Gospel、Soul 与女性声音",
        "text": "1942–2018，Memphis出生，浸礼会牧师之女，自幼接触Gospel；“Queen of Soul”“Lady Soul”。课件概述Columbia时期与1967年转往Atlantic后的突破。除演唱外参与演奏和制作，传达年轻非裔美国人、尤其女性的声音。1967–1972年1300万销量为课件历史口径。Respect考Aretha版本1967，非Otis Redding原版。"
      },
      {
        "pages": [
          14,
          15
        ],
        "title": "吉他英雄：Jimi Hendrix 与 Eric Clapton / Cream",
        "text": "Hendrix（1942–1970）出生Seattle，1966年移居London，受T-Bone Walker、Muddy Waters、B.B. King影响，以反馈和失真革新电吉他声音。Clapton（1945年生）来自Surrey，受Robert Johnson和B.B. King影响，先后加入Yardbirds、Bluesbreakers，再与Jack Bruce、Ginger Baker组成Cream。乐队、主唱与吉他手角色分别记录；Purple Haze跨第14、15页只保留一个听辨版本。"
      }
    ],
    "corrections": [
      {
        "page": 5,
        "original": "Sgt. Pepper’s Lonely Heart Club Band",
        "normalized": "Sgt. Pepper's Lonely Hearts Club Band",
        "reason": "规范标题为Hearts复数；原拼写仍接受为答案别名。"
      },
      {
        "page": 6,
        "original": "Pet Sound / good Vibration",
        "normalized": "Pet Sounds / Good Vibrations",
        "reason": "专辑和歌曲标题均为复数；保留原文映射，二者不建立收录关系。"
      },
      {
        "page": 11,
        "original": "Papa Got a Brand New Bag",
        "normalized": "Papa's Got a Brand New Bag",
        "reason": "规范标题补全所有格；原文仍接受为答案别名。"
      },
      {
        "page": 2,
        "original": "1964년: 민주당 존슨 대통령 취임",
        "normalized": "Johnson于1963年11月22日继任总统；1964年赢得总统选举",
        "reason": "区分继任、选举与后续就职；原文不覆盖。",
        "source": "https://www.lbjlibrary.org/exhibitions/permanent/november-22-1963"
      },
      {
        "page": 8,
        "original": "1965년 록 공연장 필모어 웨스트 개장",
        "normalized": "Fillmore West于1968年开业；1965年的Fillmore活动应与该场馆区分",
        "reason": "场馆名称与年份混淆，保留课件原文便于对照。",
        "source": "https://library.sfsu.edu/bata-db/bill-graham-interviewed-outside-fillmore-west-1968"
      },
      {
        "page": 8,
        "original": "SF의 지역 FM ‘KYA’ 방송국의 DJ 톰 도내휴",
        "normalized": "Tom Donahue 的自由形式FM广播关联KMPX；课件KYA的台名与制式应区分",
        "reason": "Rock Hall档案明确将自由形式FM广播归于KMPX；原文保留作对照。",
        "source": "https://catalog.rockhall.com/rrhof-ais/Details/archive/110000083"
      },
      {
        "page": 14,
        "original": "1967년 자신의 트리오 지미 헨드릭스 익스피리언스 결성",
        "normalized": "课件将成立写作1967；具体成立时间尚待独立核对",
        "reason": "1967年歌曲发行不用于反推乐队成立时间；不将此句制作成确定答案。"
      }
    ],
    "slides": [
      {
        "page": 1,
        "text": "7강: 1960년대 대중음악 (1)\n록과 소울"
      },
      {
        "page": 2,
        "text": "서장: 1960년대의 흐름과 문화    \n연대기 \n1960년: 민주당 존 F. 케네디 대통령 선거 승리. \n1961년: 케네디 대통령 취임, 미국, 베트남전 파병. \n1963년: 흑인인권운동, 워싱턴 행진. 마틴 루터 킹 목사 연설. 케네디 암살. \n1964년: 민주당 존슨 대통령 취임. \n1965년: 셀마-몽고메리 행진. 맬컴 X 암살\n1966년: 중국 문화혁명 시작. \n1967년: 쿠바 혁명가 체 게바라 볼리비아에서 피살. \n1968년: 마틴 루터 킹 암살. 프랑스 68혁명 발발. 공화당 닉슨 대통령 당선"
      },
      {
        "page": 3,
        "text": "(2) 반문화(Counterculture)와 사이키델릭\n1950년대 이후로 등장한 베이비부머들에 의해 주도. \n미국의 제국주의와 인종차별을 하나의 흐름 속에서 파악하고 이들에 대해 저항하면서 반문화가 성장. \n공동체, 자유로운 삶, 성의 평등, 자유를 적극 옹호.\n마리화나와 LSD 등 새로운 약물문제가 대두\n이러한 문화적 성격들은 당대의 대중음악에 막대한 영향을 끼침  "
      },
      {
        "page": 4,
        "text": "(1) 비틀스\n비틀스: 1960년 영국 리버풀에서 결성. 존 레넌(1940~1980), 폴 매카트니(1942), 조지 해리슨(1943~2001), 링고 스타(1940). \n1964년 <네 손을 잡고 싶어 I Want to Hold Your Hand> 미국 차트 1위 차지. 소위 ‘영국침공＇시작. \n초기 미국 로큰롤의 영향을 받다가 ‘60년대 중반부터 급진적인 진화를 보여줌. (밴드 멤버 간의 시너지, 조지 마틴의 역할)\n<예스터데이 Yesterday>(1965)\n<엘리너 리그비 Eleanor Rigby>(1966)\n1) 로큰롤에서 록으로   "
      },
      {
        "page": 5,
        "text": "앨범 [페퍼 상사의 론리 하트클럽 밴드 Sgt. Pepper’s Lonely Heart Club Band] (‘67)\n사이키델릭, 반문화, 컨셉트 앨범, 스튜디오 작업의 정점을 보여준 앨범 / 800만장 판매 "
      },
      {
        "page": 6,
        "text": "(2) 브라이언 윌슨과 비치 보이스 \n1961년, 브라이언 윌슨(1942)을 중심으로 캘리포니아에서 결성.\n1960년대 미국 로큰롤을 대표한 그룹. ’50년대 로큰롤의 유산을 물려 받았으면서도 그들만의 독특한 사운드를 만들어 낸 로큰롤 2세대이자 록의 독립적인 출발을 알린 그룹.\n아티스트 겸 프로듀서로서 컨셉앨범의 개념을 창안한 브라이언 윌슨 : 앨범 [펫 사운드 Pet Sound](‘66)\n- 비치 보이스 <서핑 USA Surfin’ USA>(1963) -로큰롤\n<멋진 진동 good Vibration> (1966)"
      },
      {
        "page": 7,
        "text": "(3) 롤링 스톤스 \n- 1962년 영국 런던에서 결성. 믹 재거, 키스 리처드 (이상 1943), 브라이언 존스 (1942~1969), 빌 와이먼 (1936), 찰리 와츠 (1941~2021)가 창단 멤버.  \n초기 로큰롤 뿐만 아니라 1950년대 시카고 블루스(일렉트릭 블루스)로부터 많은 영향을 받음 \n<만족 (할 수 없어요) (I Can’t Get No) Satisfaction> (1965)\n- <검은색으로 칠해 Paint it Black> (1966) "
      },
      {
        "page": 8,
        "text": "(4) 샌프란시스코 록 \n1960년 미국 샌프란시스코는 히피, 반문화의 중심지 역할을 함. \nSF의 지역 FM ‘KYA’ 방송국의 DJ 톰 도내휴는 주류 톱40 대신에 얼터너티브 음악을 방송. \n1965년 록 공연장 필모어 웨스트 개장. \n 제퍼슨 에어플레인: <사랑할 누구 Somebody to Love>, 앨범 [초현실적 베개 Surrealistic Pillow] (‘67)\n- 도어스: 1965년 LA에서 결성. <내 불을 밝혀줘 Light My Fire>, 앨범 [도어스 The Doors] (1967)   \n재니스 조플린(1943~1970): <서머타임 Summertime>, 앨범 [싸구려 흥분 Cheap Thrills] (‘68)"
      },
      {
        "page": 9,
        "text": "2) R&B에서 소울(Soul) 로  \n배리 고디와 모타운 레코드\n작곡가 겸 프로듀서 배리 고디(1929), 1959년 디트로이트에서 음반사 모타운 창립. \n흑인음악을 바탕으로 ’60년대 젊은 흑인음악을 지향 : 전통적인 R&B, 블루스에서 탈피. - 주류음악시장 공략. \n프로듀서의 철저한 작품 관리: 고디는 필 스펙터 이상으로 작품 뿐만 아니라 아티스트 관리에 적극적. \n홀랜드-도지어-홀랜드를 비롯한 작곡/프로듀스 시스템 완성\n템프테이션, 슈프림스, 마빈 게이, 잭슨 파이브, 스티비 원더 발굴. \n템프테이션 <마이 걸 My Girl>(1965)\n슈프림스 <서둘러 사랑할 순 없어 You Can’t Hurry Love> (1966)"
      },
      {
        "page": 10,
        "text": "(2) 레이 찰스 (1930~2004) \n1930년 조지아주 올버니 생. \n1960년대 들어서 틴 팬 앨리(<내 마음의 조지아 Georgia on My Mind>, 1960년), 컨트리 송(<사랑을 멈출 수 없어요 I Can’t Stop Loving You>, 1962년)로 모두 팝 차트 정상을 차지. \n전형적인 R&B에서 벗어난 최초의 소울 가수로 평가 받음     "
      },
      {
        "page": 11,
        "text": "(3) 제임스 브라운(1933~2006) \n사우스캐롤라이나 주 생. \n‘소울의 대부‘, ‘미스터 다이너마이트‘, ‘소울 브라더 No. 1’ \n샤우팅 창법을 구사하면서 멜로디를 과감히 생략하고, 특정 단어와 구절을 반복하는 창법. \n폴리리듬과 더불어 반복적인 리듬패턴 구사  훗날 펑크(funk)의 탄생에 결정적인 기여\n<아빠가 신상품을 샀어 Papa Got a Brand New Bag> (1965)\n- 흑인인권운동의 열기를 반영, <크게 말해- 난 흑인이고 그것이 자랑스럽다고 Say it Loud- I’m Black and I’m Proud>(‘68)  "
      },
      {
        "page": 12,
        "text": "本页无正文；嵌入 James Brown 现场视频，媒体对象标题保存在来源清单中。"
      },
      {
        "page": 13,
        "text": "(4) 아레사 프랭클린 (1942~2018) \n테네시 주 멤피스 생.  \n- ‘소울의 여왕‘, ‘레이디 소울‘ \n침례교 목사의 딸로 태어나 어릴 때부터 가스펠 익힘. \n1960~’66년까지 컬럼비아 레코드는 그녀의 장점을 잘 살리지 못함\n’67년 독립 음반사 애틀랜틱으로 자리를 옮겨 본격적으로 자신의 장점을 부각시킴\n1967~1972년까지 1300만장 판매.  \n당시 여성 음악인으로서는 드물게 보컬 외에도 연주, 앨범 제작 과정에 적극적으로 참여 \n힘있는 목소리로 당시 젊은 아프리카계 (여성) 젊은이들의 목소리를 전달 \n<존중하라 Respect>(1967)"
      },
      {
        "page": 14,
        "text": "4) 기타의 영웅들: 로큰롤과 블루스의 ‘60년대 결합 \n지미 헨드릭스 (1942~1970)\n시애틀 생. 1966년 런던으로 이주. \n1967년 자신의 트리오 지미 헨드릭스 익스피리언스 결성. \n<보라색 안개 Purple Haze> (1967)\n흑인 음악인이면서도 R&B 차트와 무관하게 록 필드에서 활동(하지만 그의 음악에는 T-본 워커, 머디 워터스, B.B.킹의 강한 영향이 있음)\n혁명적인 피드백, 디스토션 사운드 구사 \n (2) 에릭 클랩턴 (1945)\n- 영국, 서리 주 생. \n로버트 존슨, BB킹의 블루스로부터 절대적인 영향을 받음\n야드버즈, 블루스브레이커스를 거쳐 잭 브루스(1943~2014), 진저 베이커(1939~2019)와 함께 밴드 ‘크림‘ 결성 "
      },
      {
        "page": 15,
        "text": "크림 (The Cream): <사랑의 햇살 Sunshine of Your Love> (1967)\n- 지미 헨드릭스 & 익스피리언스: <보라색 안개 Purple Haze> (1967)"
      }
    ],
    "quiz": [
      {
        "question": "英国入侵在本课中以哪一首歌的美国成功为节点？",
        "answer": "I Want to Hold Your Hand，课程节点1964年；首次发行1963年。"
      },
      {
        "question": "Pet Sounds与Good Vibrations是什么关系？",
        "answer": "分别为1966年的专辑和单曲；原版Pet Sounds未收录Good Vibrations。"
      },
      {
        "question": "George Martin与Brian Wilson在课件中的制作角色？",
        "answer": "George Martin是披头士制作人；Brian Wilson兼创作者、艺人和制作人。不能将制作人直接当作每首歌曲演唱者。"
      },
      {
        "question": "Motown的创始人、时间、城市与创作体系？",
        "answer": "Berry Gordy；1959；Detroit；Holland–Dozier–Holland。"
      },
      {
        "question": "My Girl应区分哪两个年份？",
        "answer": "单曲首次发行1964；课件以1965年登顶口径评分。"
      },
      {
        "question": "Ray Charles的两首跨风格例曲？",
        "answer": "Georgia on My Mind（1960年版本，Tin Pan Alley）；I Can’t Stop Loving You（1962年版本，Country）。"
      },
      {
        "question": "James Brown对Funk发展的节奏贡献？",
        "answer": "喊唱、反复词句、缩减旋律、多重节奏与重复节奏型。"
      },
      {
        "question": "Summertime本课考哪一个版本？",
        "answer": "Janis Joplin主唱、Big Brother & the Holding Company的Cheap Thrills（1968）版本。"
      },
      {
        "question": "Respect本课考谁、哪一年？",
        "answer": "Aretha Franklin，1967年版本；不混入Otis Redding原版。"
      },
      {
        "question": "Cream的成员与吉他手？",
        "answer": "Eric Clapton（吉他）、Jack Bruce、Ginger Baker。"
      },
      {
        "question": "Hendrix的电吉他声音创新？",
        "answer": "反馈（feedback）与失真（distortion），结合蓝调根源与摇滚。"
      }
    ],
    "rights": "媒体来自用户上传课件；来源并不等于已获得公开传播授权。保留原有媒体，不额外下载或替换商业录音。新增专辑封面为本站原创排版示意，非原唱片封面；真实封面通过官方来源链接查阅。",
    "attachmentSha256": "2fb0340fb5cd332f547f68b43431b113b07d6e23e5a13f0fd569ebfc5e83df91",
    "songsIncluded": 20,
    "videoEvidence": {
      "id": "t73",
      "included": true,
      "artist": {
        "page": 11,
        "original": "(3) 제임스 브라운(1933~2006)"
      },
      "year": {
        "page": 11,
        "original": "<아빠가 신상품을 샀어 Papa Got a Brand New Bag> (1965)"
      },
      "style": {
        "page": 9,
        "original": "2) R&B에서 소울(Soul) 로",
        "scope": "第9–13页Soul章节；第11页为其中的James Brown段落"
      },
      "video": {
        "page": 12,
        "objectName": "James Brown - Papa's Got A Brand New Bag Live 1965 (Remasterted)"
      },
      "yearBasis": "1965为课件明确给出的歌曲年份，不认定为已独立核实的现场日期"
    }
  }
};

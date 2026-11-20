// 更新说明与「小设计」合集。界面在 guide.js。
//
// 每次更新：在 RELEASES 最前面加一条。v 用日期，同一天第二次更新在日期后加 b、c（如 '2026-11-16b'）。
//   title / text 写成 {zh, ko, en} 三种语言；只写中文字符串也可以，韩文、英文界面会显示中文。
//   t: 'new' 新功能 · 'fix' 修复 · 'tweak' 改进
//   go（可选）：'start' 上手指南 · 'details' 小设计 · 'feedback' 问题反馈 · 'history' 历史页 · 'catalog-video' 目录里的「有视频」 · 'disc' 盘面
// 老用户打开网站时，左下角会出现一次这条更新的小纸条；新用户只看上手指南，不打扰。
// 新的小设计加到 DESIGNS 里，since 写这次更新的 v，更新说明里会标「新」。
export const RELEASES = [
  {v: '2026-11-20b', title: {zh: '手机上的星空更大了', ko: '휴대폰에서 더 넓어진 별하늘', en: 'A bigger sky on phones'}, items: [
    {t: 'tweak', text: {zh: '手机上唱片页的舞台几乎占满一屏，盘的上下都有星空可以点、按住和划动；竖着划照常滚动页面。', ko: '휴대폰에서 레코드 화면이 거의 한 화면을 채우고, 디스크 위아래에 누르고 끌 수 있는 별하늘이 생겼습니다. 세로로 밀면 평소처럼 페이지가 스크롤됩니다.', en: 'On phones the record stage now fills almost the whole screen, with sky above and below the disc to tap, hold and swipe; vertical swipes still scroll the page.'}},
    {t: 'new', text: {zh: '点盘边的数字 0–9，年份个位是这个数字的歌会从天上浮出来（和电脑上按数字键一样）。', ko: '디스크 가장자리의 숫자 0–9를 누르면 연도 끝자리가 그 숫자인 노래가 하늘에 떠오릅니다(컴퓨터의 숫자 키와 같아요).', en: 'Tap a rim digit 0–9 and songs whose year ends in that digit rise into the sky (same as the number keys on a computer).'}},
    {t: 'fix', text: {zh: '修复 iPhone 上背景音乐不响：打开静音开关时也能听到，第一次点屏幕就开始。', ko: 'iPhone에서 배경음악이 들리지 않던 문제를 고쳤습니다. 무음 스위치가 켜져 있어도 들리고, 화면을 처음 누르면 시작합니다.', en: 'Fixed background music not playing on iPhone: it now plays even with the silent switch on and starts on your first tap.'}}
  ]},
  {v: '2026-11-20', title: {zh: '会回应的天空', ko: '반응하는 하늘', en: 'A sky that answers back'}, items: [
    {t: 'new', text: {zh: '点天上的空白处会泛起水波，推开附近的星；按住一会儿，星绕着手指聚拢，松手时炸开一道大波；在天上拖动，身后留下一道尾流。用力甩唱片，整片天也跟着转。', ko: '하늘의 빈 곳을 누르면 물결이 퍼지며 주변 별을 밀어냅니다. 잠시 누르고 있으면 별이 손가락 주위로 모였다가 손을 떼면 큰 물결로 퍼지고, 하늘을 끌면 뒤로 물살이 남습니다. 레코드를 세게 돌리면 하늘 전체도 함께 돕니다.', en: 'Tap an empty patch of sky and a ripple spreads, pushing nearby stars aside. Hold for a moment and the stars swirl in around your finger, then burst into a big wave when you let go; drag across the sky to leave a wake. Spin the record hard and the whole sky turns with it.'}},
    {t: 'new', text: {zh: '指针停在天上的封面上，它会停下来并写出歌名和年份；点它翻成一张卡片，可以在盘上找到这首歌，或直接落针。按数字键 0–9，年份个位是这个数字的歌会从天上浮出来。', ko: '하늘의 앨범 표지 위에 포인터를 올리면 멈춰서 곡명과 연도를 보여 줍니다. 누르면 카드로 뒤집혀 디스크에서 그 곡을 찾거나 바로 바늘을 내릴 수 있습니다. 숫자 키 0–9를 누르면 연도 끝자리가 그 숫자인 노래가 하늘에 떠오릅니다.', en: 'Rest the pointer on a cover in the sky and it stops and shows its title and year; click it and it flips into a card that can find the song on the disc or drop the needle. Press 0–9 and songs whose year ends in that digit rise into the sky.'}},
    {t: 'new', text: {zh: '你的星空：学会的歌在天上变成一颗不动的星，越熟越亮；到了该复习的时候会慢慢变暗，点它就能再听一次。同一讲的歌都学会了，会连成一个星座。', ko: '나의 별하늘: 외운 노래는 하늘에서 움직이지 않는 별이 되고, 익숙할수록 밝아집니다. 복습할 때가 되면 천천히 어두워지고, 누르면 다시 들을 수 있습니다. 한 강의 노래를 모두 외우면 별자리로 이어집니다.', en: 'Your own sky: every song you have learned becomes a fixed star, brighter the better you know it. When it is time to review, it slowly dims; click it to listen again. Learn every song in a lecture and they join into a constellation.'}},
    {t: 'new', text: {zh: '天文年表：指针在盘上的一个年代停一会儿，天上会出现那个年代真实发生过的一件天文事件，比如 1957 年的斯普特尼克 1 号、1967 年的脉冲星。背景音乐开着时，点击和这些事件都有很轻的声音。', ko: '천문 연표: 디스크의 한 연대에 포인터를 잠시 올려 두면 그 시대에 실제로 일어난 천문 사건이 하늘에 나타납니다. 예를 들어 1957년 스푸트니크 1호, 1967년 펄서. 배경음악이 켜져 있으면 누를 때와 이런 사건에 아주 작은 소리가 납니다.', en: 'An astronomical timeline: rest the pointer on a decade of the disc and the sky shows something that really happened in that decade, such as Sputnik 1 in 1957 or the first pulsar in 1967. With background music on, taps and these events make soft sounds.'}}
  ]},
  {v: '2026-11-19', title: {zh: '唱片下面的星空', ko: '레코드 아래의 별하늘', en: 'A night sky under the record'}, items: [
    {t: 'new', text: {zh: '唱片页的盘下面换成了缓缓前进的星空：唱片的封面像记忆一样在远处显影、再慢慢隐去，留下一颗带着它颜色的星；偶尔有暗云从面前经过。', ko: '레코드 화면의 판 아래가 천천히 앞으로 나아가는 별하늘로 바뀌었습니다. 음반 표지가 기억처럼 멀리서 현상되었다가 천천히 사라지며 그 색을 띤 별 하나를 남기고, 가끔 어두운 구름이 앞을 지나갑니다.', en: 'Beneath the record there is now a slowly advancing night sky: album covers develop in the distance like memories, fade away and leave a star in their colour, and now and then a dark cloud drifts past.'}, go: 'disc'},
    {t: 'new', text: {zh: '星空会让着你：你在读曲目表、点按或打字时，天上不开始新的变化；听歌时天空随唱片慢慢转，亮星拖出细细的星轨。做完一轮回到盘面时，进步最多的那首会在它年份尾数的方向上先被想起。', ko: '별하늘은 방해하지 않습니다. 곡 목록을 읽거나 누르거나 입력하는 동안에는 새 변화가 시작되지 않고, 음악을 들을 때는 하늘이 레코드와 함께 천천히 돌며 밝은 별이 가는 궤적을 남깁니다. 한 판을 마치고 돌아오면 가장 많이 늘어난 곡이 그 연도 끝자리 방향에 먼저 떠오릅니다.', en: 'The sky stays out of your way: nothing new starts while you read the track list, click or type. While music plays the sky turns slowly with the record and bright stars draw thin trails. After a round, the song you improved most is recalled first, in the direction of its year’s last digit.'}},
    {t: 'new', text: {zh: '唱片页有了一段安静的背景音乐：落针听歌时自动让开，停下后从刚才的位置慢慢回来；左上角写着这首曲子的名字，旁边的按钮可以关掉它。', ko: '레코드 화면에 조용한 배경음악이 생겼습니다. 바늘을 내려 곡을 들으면 자동으로 멈추고, 멈추면 아까 그 자리부터 천천히 다시 들립니다. 왼쪽 위에 곡 이름이 있고, 옆의 버튼으로 끌 수 있습니다.', en: 'The record page now has quiet background music. It steps aside when you drop the needle and fades back in from where it left off when you stop; its title sits at the top left, with a button to turn it off.'}},
    {t: 'new', text: {zh: '图例那一行末尾有「星空 · 暂停」：随时停在当前这一帧。系统设了减少动态时，只显示一张静止的星空。', ko: '범례 줄 끝의 ‘별하늘 · 멈춤’으로 언제든 지금 화면에서 멈출 수 있습니다. 시스템에서 동작 줄이기를 켜면 멈춘 별하늘 한 장만 보입니다.', en: 'Use “Sky · Pause” at the end of the legend row to freeze the sky on the current frame. With reduced motion turned on in your system, the sky is a single still image.'}}
  ]},
  {v: '2026-11-17', title: {zh: '答对的进步看得见', ko: '맞힌 만큼 보이는 진도', en: 'Correct answers move progress forward'}, items: [
    {t: 'fix', text: {zh: '修复薄弱项目的进度条一直停在 12%：年份、歌名、音乐家和风格答对后都会继续增长。原有作答记录与掌握标准保留。', ko: '취약한 항목의 진도가 12%에 멈추던 문제를 고쳤습니다. 연도·곡명·음악가·장르를 맞히면 계속 늘어납니다. 기존 기록과 숙달 기준은 유지됩니다.', en: 'Weak fields no longer get stuck at 12%: correct year, song, artist and style answers keep moving forward. Existing answers and mastery criteria are preserved.'}},
    {t: 'fix', text: {zh: '音频换源保留最新定位；流畅档加载失败后，不再反复切回同一个失败档位。', ko: '음원 전환 시 가장 최근에 지정한 재생 위치를 유지하고, 절약 음질 로딩 실패 후 같은 파일로 반복 전환하지 않습니다.', en: 'Audio source changes keep your latest seek target and no longer retry the same failed data-saver source in a loop.'}}
  ]},
  {v: '2026-11-16d', title: {zh: '网慢也不卡：自动画质和音质', ko: '느린 인터넷에서도 끊김 없이: 자동 화질·음질', en: 'Smooth on slow connections: automatic quality'}, items: [
    {t: 'new', text: {zh: '音频和课件视频会按你当前的网速自动选档：网慢时放 64k 流畅音质和 360p / 240p 视频，网快时放原音质和 720p / 1080p。', ko: '지금 인터넷 속도에 맞춰 음악과 강의 영상의 품질을 자동으로 고릅니다. 느릴 때는 64k 절약 음질과 360p/240p 영상, 빠를 때는 원래 음질과 720p/1080p로 재생합니다.', en: 'Audio and lecture videos now pick a quality for your connection: 64k data-saver audio and 360p/240p video when it is slow, original audio and 720p/1080p when it is fast.'}, go: 'catalog-video'},
    {t: 'fix', text: {zh: '播放中一旦卡住，会自动降一档并从同一秒接着放，不用手动重来；视频下方也能自己选画质。', ko: '재생 중 끊기면 자동으로 한 단계 낮춰 같은 지점부터 이어서 재생합니다. 영상 아래에서 화질을 직접 고를 수도 있습니다.', en: 'If playback stalls, it steps down a level and carries on from the same second; you can also pick the video quality yourself.'}},
    {t: 'tweak', text: {zh: '封面图换成轻量版（总共从 9 MB 减到 2.6 MB），不再和音乐抢网速。', ko: '앨범 표지를 가벼운 버전으로 바꿨습니다(전체 9MB → 2.6MB). 더 이상 음악과 인터넷 속도를 다투지 않습니다.', en: 'Cover images are now lightweight (9 MB → 2.6 MB in total), so they no longer compete with the music for bandwidth.'}}
  ]},
  {v: '2026-11-16c', title: {zh: '播放模式、三种语言和问题反馈', ko: '재생 방식, 3개 언어, 문의하기', en: 'Play modes, three languages and feedback'}, items: [
    {t: 'new', text: {zh: '落针试听像听歌软件一样：底部播放条有上一首、暂停、下一首和进度条，可选顺序播放、随机播放、单曲循环。', ko: '바늘 내려 듣기가 음악 앱처럼 바뀌었습니다. 아래 재생 바에 이전 곡, 일시정지, 다음 곡, 재생 위치가 있고 순서대로·셔플·한 곡 반복을 고를 수 있습니다.', en: 'Needle-drop listening now works like a music app: a player bar with previous, pause, next and a progress bar, plus In order, Shuffle and Repeat one.'}, go: 'disc'},
    {t: 'new', text: {zh: '界面支持中文、한국어、English：点右上角的语言按钮切换。', ko: '화면을 중국어, 한국어, 영어로 볼 수 있습니다. 오른쪽 위 언어 버튼으로 바꾸세요.', en: 'The interface now comes in Chinese, Korean and English. Switch with the language button at the top right.'}},
    {t: 'fix', text: {zh: '做完一轮后在手机上右滑返回，不会再悄悄多出一轮，也不再一直提示「继续未完成的一轮 · 已答 0 首」。', ko: '한 판을 마친 뒤 휴대폰에서 뒤로 가기를 해도 새 판이 몰래 생기지 않고, ‘0곡 답함’ 이어 하기 안내도 더 이상 뜨지 않습니다.', en: 'Swiping back on a phone after finishing a round no longer quietly starts a new one, and the “Continue · 0 answered” prompt is gone.'}},
    {t: 'fix', text: {zh: '打开网站和做题更快：进入时先载入盘面要用的部分，说明和长读放到后面；做题时提前准备下一首的音频和波形，点「下一首」马上出声。', ko: '사이트를 열 때와 문제를 풀 때 더 빨라졌습니다. 처음에는 판에 필요한 부분만 먼저 불러오고 안내와 긴 해설은 나중에 불러옵니다. 문제를 푸는 동안 다음 곡의 음악과 파형을 미리 준비해 ‘다음 곡’을 누르면 바로 소리가 납니다.', en: 'Opening the site and quizzing are faster: the disc loads first while the guide and long reads come later, and the next song’s audio and waveform are fetched while you answer, so “Next” plays right away.'}},
    {t: 'new', text: {zh: '新增「问题反馈」：发现问题或有建议，可以直接联系作者。', ko: '‘문의하기’를 추가했습니다. 문제나 제안이 있으면 만든 사람에게 바로 연락할 수 있습니다.', en: 'New Feedback page: report a problem or suggest something straight to the author.'}, go: 'feedback'}
  ]},
  {v: '2026-11-16b', title: {zh: '1080p 课件视频', ko: '1080p 강의 영상', en: '1080p lecture videos'}, items: [
    {t: 'new', text: {zh: '4 段课件视频可以看 1080p 原画：两段 Maple Leaf Rag（自动钢琴、班卓琴）、Cross Road Blues、Hound Dog 电视现场。', ko: '강의 영상 4편을 1080p 원본 화질로 볼 수 있습니다: Maple Leaf Rag 2편(자동 피아노, 밴조), Cross Road Blues, Hound Dog TV 라이브.', en: 'Four lecture videos now play in original 1080p: two Maple Leaf Rags (player piano, banjo), Cross Road Blues and the Hound Dog TV performance.'}, go: 'catalog-video'},
    {t: 'tweak', text: {zh: '网速跟不上时自动换成 720p，从同一秒接着放；视频下方也可以自己选画质。', ko: '인터넷이 느리면 720p로 자동 전환해 같은 지점부터 이어서 재생합니다. 영상 아래에서 화질을 직접 고를 수도 있습니다.', en: 'If your connection can’t keep up, it switches to 720p and carries on from the same second. You can also pick the quality under the video.'}}
  ]},
  {v: '2026-11-16', title: {zh: '课件视频、上手指南和导入备份', ko: '강의 영상, 시작 안내, 백업 가져오기', en: 'Lecture videos, quick guide and backup import'}, items: [
    {t: 'new', text: {zh: '8 首歌带「视频」标签，在歌曲详情里直接看课件视频。', ko: '8곡에 ‘영상’ 표시가 붙었고, 곡 상세에서 바로 강의 영상을 볼 수 있습니다.', en: 'Eight songs carry a “Video” tag; watch the lecture video right in the song details.'}, go: 'catalog-video'},
    {t: 'new', text: {zh: '目录新增「有视频」筛选。', ko: '목록에 ‘영상 있음’ 필터를 추가했습니다.', en: 'The catalog has a new “With video” filter.'}},
    {t: 'new', text: {zh: '第一次打开有 30 秒上手指南；右上角「?」随时再看。', ko: '처음 열면 30초 시작 안내가 나옵니다. 오른쪽 위 ‘?’로 언제든 다시 볼 수 있습니다.', en: 'A 30-second quick guide on your first visit; the “?” at the top right brings it back any time.'}, go: 'start'},
    {t: 'new', text: {zh: '「历史」可以导入学习备份：只补上缺少的记录，已有的不会被覆盖。', ko: '‘기록’에서 학습 백업을 가져올 수 있습니다. 없는 기록만 채우고 기존 기록은 덮어쓰지 않습니다.', en: 'History can import a learning backup: it only adds what’s missing and never overwrites existing records.'}, go: 'history'},
    {t: 'new', text: {zh: '有了这份更新说明，以及收集所有细节设计的「小设计」。', ko: '이 업데이트 소식과 숨은 디자인을 모은 ‘작은 디자인’을 추가했습니다.', en: 'Added these release notes and “Details”, a collection of all the small design touches.'}, go: 'details'},
    {t: 'tweak', text: {zh: '网站搬到新网址，音频、封面和视频放在一起发布。', ko: '사이트를 새 주소로 옮기고 음원, 표지, 영상을 함께 배포합니다.', en: 'The site moved to a new address, with audio, covers and video published together.'}}
  ]},
  {v: '2026-11-13', title: {zh: '同年封套站上唱片', ko: '같은 해 재킷이 레코드 위로', en: 'Same-year sleeves on the record'}, items: [
    {t: 'new', text: {zh: '贴近一个年代时，同一年的封套站在盘上排开，随盘转动；转到哪张就选哪张。', ko: '한 연대를 확대하면 같은 해의 재킷이 레코드 위에 늘어서 함께 돕니다. 돌려서 멈춘 재킷이 선택됩니다.', en: 'Zoom into a decade and the sleeves from the same year stand on the record and turn with it; whichever you spin to is selected.'}},
    {t: 'fix', text: {zh: '平面盘（不支持 3D 的设备）也能用方向键换年代、换歌，空格落针。', ko: '평면 레코드(3D를 지원하지 않는 기기)에서도 방향키로 연대와 곡을 바꾸고 스페이스로 바늘을 내릴 수 있습니다.', en: 'The flat record (for devices without 3D) now supports arrow keys for decades and songs, and Space to drop the needle.'}}
  ]},
  {v: '2026-11-11', title: {zh: '母盘：75 首歌排成一张唱片', ko: '마스터 디스크: 75곡을 한 장의 레코드로', en: 'The master disc: 75 songs on one record'}, items: [
    {t: 'new', text: {zh: '盘面：外圈 1854，内圈 1968，一圈一首歌，一个年代一条带。', ko: '레코드 면: 바깥 1854년, 안쪽 1968년. 한 바퀴가 한 곡, 한 연대가 한 띠입니다.', en: 'The record: 1854 on the outside, 1968 at the centre; one ring per song, one band per decade.'}, go: 'disc'},
    {t: 'new', text: {zh: '落针听辨：每首答歌名、年份、音乐家、风格，答对的部分刻进盘里。', ko: '바늘 내리기 청음: 곡마다 곡명, 연도, 음악가, 장르를 답하고, 맞힌 부분이 레코드에 새겨집니다.', en: 'Needle-drop quiz: name the song, year, artist and style; what you get right is cut into the record.'}},
    {t: 'new', text: {zh: '当场订正：答错的项红笔圈出，凭记忆写一遍；点遮挡处可单独看一个词。', ko: '바로 고쳐 쓰기: 틀린 항목에 빨간 동그라미가 쳐지고, 기억으로 한 번 써 봅니다. 가린 곳을 누르면 단어 하나만 잠깐 볼 수 있습니다.', en: 'Instant correction: wrong answers are circled in red and you rewrite them from memory; tap the cover to peek at one word.'}},
    {t: 'new', text: {zh: '听辨时按 Y 翻看年份卡片。', ko: '청음 중 Y를 누르면 연도 카드를 볼 수 있습니다.', en: 'Press Y during a quiz to flip through the year cards.'}},
    {t: 'fix', text: {zh: '连续拖动或按键调进度时，播放位置不再跳回原处。', ko: '재생 위치를 연속으로 옮겨도 원래 자리로 되돌아가지 않습니다.', en: 'Scrubbing repeatedly no longer snaps playback back to where it was.'}},
    {t: 'fix', text: {zh: '听辨页的左右键用来换答题项，不再被波形抢走。', ko: '청음 화면의 좌우 방향키는 답 칸 이동에 쓰이고, 파형이 가로채지 않습니다.', en: 'Left/right keys on the quiz page move between answers instead of being captured by the waveform.'}}
  ]},
  {v: '2026-11-04', title: {zh: '第七讲', ko: '7강', en: 'Lecture 7'}, items: [
    {t: 'new', text: {zh: '新增第七讲 19 段音频和 1 段现场视频音轨，共 7 讲 75 首。', ko: '7강 음원 19개와 라이브 영상 음원 1개를 추가해 모두 7강 75곡입니다.', en: 'Added Lecture 7: 19 audio clips and one live video soundtrack, for 75 songs across 7 lectures.'}}
  ]},
  {v: '2026-10-30', title: {zh: '课件视频里的音乐', ko: '강의 영상 속 음악', en: 'Music from the lecture videos'}, items: [
    {t: 'new', text: {zh: '7 段课件视频的音轨加入听辨，如自动钢琴版 Maple Leaf Rag、Elvis 的 Hound Dog 电视现场。', ko: '강의 영상 7편의 음원을 청음에 추가했습니다. 자동 피아노 Maple Leaf Rag, 엘비스의 Hound Dog TV 라이브 등.', en: 'Soundtracks from 7 lecture videos joined the quiz, such as the player-piano Maple Leaf Rag and Elvis’s Hound Dog on TV.'}},
    {t: 'tweak', text: {zh: '视频音轨只保留音乐段，去掉开头的操作声和片尾空白。', ko: '영상 음원은 음악 부분만 남기고 앞쪽 조작 소리와 끝의 공백을 잘랐습니다.', en: 'Video soundtracks keep only the music, without the handling noise at the start or silence at the end.'}}
  ]},
  {v: '2026-10-29', title: {zh: '填空题防误触', ko: '주관식 실수 방지', en: 'Safer fill-in answers'}, items: [
    {t: 'fix', text: {zh: '填空题四项都写了（或标成没听出）才能提交，空白不会被自动算成「不知道」。', ko: '주관식은 네 칸을 모두 쓰거나 ‘모르겠음’으로 표시해야 제출됩니다. 빈칸이 자동으로 ‘모름’ 처리되지 않습니다.', en: 'Fill-in answers can only be submitted when all four are filled (or marked as not caught); blanks are no longer counted as “don’t know”.'}}
  ]},
  {v: '2026-10-28', title: {zh: 'Hound Dog 合并', ko: 'Hound Dog 통합', en: 'Hound Dog merged'}, items: [
    {t: 'fix', text: {zh: '两讲里同一版 Big Mama Thornton 的 Hound Dog 合并成一首，年份统一为 1952，混选时不再重复出题。', ko: '두 강의에 나온 같은 Big Mama Thornton의 Hound Dog를 한 곡으로 합치고 연도를 1952년으로 통일해, 함께 골라도 중복 출제되지 않습니다.', en: 'Big Mama Thornton’s Hound Dog, used in two lectures, is now one song dated 1952 and is no longer asked twice.'}}
  ]},
  {v: '2026-10-27', title: {zh: '整轮洗牌', ko: '한 바퀴 섞기', en: 'Full-round shuffle'}, items: [
    {t: 'tweak', text: {zh: '随机听辨按整个范围洗牌，一轮之内不重复。', ko: '랜덤 청음은 범위 전체를 섞어 한 바퀴 안에서는 반복되지 않습니다.', en: 'Random quizzes shuffle the whole range, with no repeats within a round.'}}
  ]},
  {v: '2026-10-24', title: {zh: '第六讲', ko: '6강', en: 'Lecture 6'}, items: [
    {t: 'new', text: {zh: '新增第六讲 13 段音频。', ko: '6강 음원 13개를 추가했습니다.', en: 'Added Lecture 6: 13 audio clips.'}}
  ]},
  {v: '2026-10-19', title: {zh: '填空题', ko: '주관식', en: 'Fill-in answers'}, items: [
    {t: 'new', text: {zh: '新增填空题：自己写出四项，课程里的中、韩、英文名称和别名都算对。', ko: '주관식 추가: 네 항목을 직접 쓰며, 강의에 나온 중국어·한국어·영어 이름과 별칭 모두 정답으로 인정합니다.', en: 'New fill-in mode: type all four yourself; Chinese, Korean and English names and aliases from the course all count.'}}
  ]},
  {v: '2026-10-16', title: {zh: '第五讲', ko: '5강', en: 'Lecture 5'}, items: [
    {t: 'new', text: {zh: '新增第五讲 13 段音频：二战后的美国与韩国大众音乐。', ko: '5강 음원 13개 추가: 2차 세계대전 이후 미국과 한국의 대중음악.', en: 'Added Lecture 5: 13 clips of post-war American and Korean popular music.'}}
  ]},
  {v: '2026-10-10', title: {zh: '第一版', ko: '첫 버전', en: 'First version'}, items: [
    {t: 'new', text: {zh: '选课件，随机听歌，答歌名、年份、音乐家、风格。', ko: '강의를 고르고, 무작위로 곡을 들으며 곡명, 연도, 음악가, 장르를 답합니다.', en: 'Pick lectures, hear random songs, answer song, year, artist and style.'}}
  ]}
];

// 藏在细节里的设计：不知道也能用，知道了更顺手。group 用中文写，界面会翻译。
export const DESIGNS = [
  {id: 'digits', group: '唱片', title: {zh: '盘缘的 0—9', ko: '가장자리의 0–9', en: 'The 0–9 on the rim'}, text: {zh: '是年份的个位数。同一个角度上的歌，年份尾数相同。', ko: '연도의 끝자리입니다. 같은 각도에 있는 곡은 연도 끝자리가 같습니다.', en: 'They are the last digit of the year. Songs at the same angle share that digit.'}},
  {id: 'spoke', group: '唱片', title: {zh: '同一条辐线', ko: '같은 바퀴살', en: 'Same spoke'}, text: {zh: '歌曲详情最后列出「X 号辐上还有」：年份尾数相同的歌，适合放在一起记。', ko: '곡 상세 맨 끝의 ‘X번 살에 또 있는 곡’은 연도 끝자리가 같은 곡들이라 함께 외우기 좋습니다.', en: 'The end of each song’s details lists “Also on spoke X”: songs whose years end in the same digit, handy to learn together.'}},
  {id: 'grooves', group: '唱片', title: {zh: '四道刻纹', ko: '네 줄의 홈', en: 'Four grooves'}, text: {zh: '每一圈分歌名、年份、音乐家、风格四道，哪一项没记住一眼就看得出来。', ko: '각 바퀴는 곡명·연도·음악가·장르 네 줄로 나뉘어, 무엇을 아직 못 외웠는지 한눈에 보입니다.', en: 'Each ring has four grooves — song, year, artist, style — so you can see at a glance what you haven’t learned yet.'}},
  {id: 'coarse', group: '唱片', title: {zh: '粗纹与密纹', ko: 'SP와 LP 홈', en: 'Coarse and fine grooves'}, text: {zh: '1940 年代及更早的年代带是 78 转粗纹，之后是密纹。', ko: '1940년대까지의 띠는 78회전 굵은 홈, 그 뒤는 가는 LP 홈입니다.', en: 'Bands up to the 1940s are coarse 78 rpm grooves; later ones are fine microgrooves.'}},
  {id: 'sleeves', group: '唱片', title: {zh: '同年封套', ko: '같은 해 재킷', en: 'Same-year sleeves'}, text: {zh: '贴近一个年代时，同一年的封套站在盘上排开；拖着盘转，转到哪张就选哪张。', ko: '연대를 확대하면 같은 해 재킷이 레코드 위에 늘어섭니다. 레코드를 돌려 멈춘 재킷이 선택됩니다.', en: 'Zoom into a decade and same-year sleeves stand on the record; spin it and whichever faces you is selected.'}},
  {id: 'celebrate', group: '唱片', title: {zh: '当场刻上', ko: '바로 새기기', en: 'Cut before your eyes'}, text: {zh: '一轮结束回到盘面，这一轮答过的圈会当着你的面刻上去。', ko: '한 판을 마치고 레코드로 돌아오면, 이번에 답한 바퀴가 눈앞에서 새겨집니다.', en: 'Finish a round and return to the record: the rings you just answered are cut while you watch.'}},
  {id: 'lecture', group: '唱片', title: {zh: '只练一讲', ko: '한 강만 연습', en: 'Practise one lecture'}, text: {zh: '盘面右侧点讲名，就只练这一讲；点方格可以把几讲组合成范围。', ko: '오른쪽에서 강의 이름을 누르면 그 강만 연습합니다. 네모 칸으로 여러 강을 묶을 수 있습니다.', en: 'Click a lecture name on the right to practise just that one; tick the boxes to combine several.'}},
  {id: 'cover', group: '唱片', title: {zh: '封面来源', ko: '표지 출처', en: 'Cover sources'}, text: {zh: '详情里的封面会注明是专辑封面、乐谱封面还是历史资料图，并附来源。', ko: '상세의 표지가 앨범 표지인지, 악보 표지인지, 역사 자료 사진인지 밝히고 출처를 붙였습니다.', en: 'Each cover says whether it’s an album cover, sheet-music cover or historical image, with its source.'}},
  {id: 'quality', group: '唱片', since: '2026-11-16b', title: {zh: '画质自动调', ko: '화질 자동 조절', en: 'Auto video quality'}, text: {zh: '1080p 视频卡住时会自动换成 720p，从同一秒接着放；视频下方也能自己选。', ko: '1080p 영상이 멈추면 720p로 바꿔 같은 지점부터 이어 재생합니다. 영상 아래에서 직접 고를 수도 있습니다.', en: 'If a 1080p video stalls it drops to 720p and resumes at the same second; you can also choose under the video.'}},
  {id: 'songat', group: '唱片', title: {zh: '从音乐开始', ko: '음악부터 재생', en: 'Skip to the music'}, text: {zh: '有的课件视频前面是讲解，点「从音乐开始」直接跳到音乐。', ko: '앞부분이 설명인 강의 영상은 ‘음악부터 재생’으로 바로 음악으로 갈 수 있습니다.', en: 'Some lecture videos open with talk; “Start at the music” jumps straight to it.'}},
  {id: 'wave', group: '听辨', title: {zh: '真实的波形', ko: '진짜 파형', en: 'Real waveform'}, text: {zh: '声槽是这首歌真实的音量起伏，点或拖就能跳到那一段。', ko: '홈 모양은 이 곡의 실제 음량 변화입니다. 누르거나 끌면 그 부분으로 이동합니다.', en: 'The groove shows the song’s real loudness; click or drag to jump there.'}},
  {id: 'keys', group: '听辨', title: {zh: '不用鼠标也行', ko: '마우스 없이도', en: 'No mouse needed'}, text: {zh: '1—4 选择，0 没听出，Enter 提交，空格播放或暂停。', ko: '1–4 선택, 0 모르겠음, Enter 제출, 스페이스 재생/일시정지.', en: '1–4 to choose, 0 for didn’t catch it, Enter to submit, Space to play or pause.'}},
  {id: 'cards', group: '听辨', title: {zh: '年份卡片', ko: '연도 카드', en: 'Year cards'}, text: {zh: '按 Y 翻看年份卡片，不影响作答；当前这首提交前，只放本轮已经答过的歌，不剧透。', ko: 'Y로 연도 카드를 넘겨 봐도 답에는 영향이 없습니다. 지금 곡을 제출하기 전에는 이번 판에 답한 곡만 보여 줘 스포일러가 없습니다.', en: 'Press Y to browse year cards without affecting your answer; before you submit, it only shows songs already answered this round — no spoilers.'}},
  {id: 'aliases', group: '听辨', title: {zh: '别名都算对', ko: '별칭도 정답', en: 'Aliases count'}, text: {zh: '填空题认课程里的中、韩、英文名称和别名，大小写和标点不影响。', ko: '주관식은 강의의 중국어·한국어·영어 이름과 별칭을 모두 인정하고, 대소문자와 문장부호는 무시합니다.', en: 'Fill-in accepts the course’s Chinese, Korean and English names and aliases, ignoring case and punctuation.'}},
  {id: 'pen', group: '订正', title: {zh: '红笔订正', ko: '빨간 펜 교정', en: 'Red-pen correction'}, text: {zh: '答错的项用红笔圈出；开始写时答案会被盖住，凭记忆写一遍再核对。订正不改成绩。', ko: '틀린 항목은 빨간 펜으로 동그라미가 쳐지고, 쓰기 시작하면 답이 가려져 기억으로 쓴 뒤 확인합니다. 교정은 점수를 바꾸지 않습니다.', en: 'Wrong answers are circled in red; the answer is covered once you start typing, so you write it from memory. Corrections don’t change your score.'}},
  {id: 'peek', group: '订正', title: {zh: '偷看一个词', ko: '단어 하나 엿보기', en: 'Peek at one word'}, text: {zh: '订正时点遮住的地方，可以单独看一个词 1.2 秒，同一时间只露一个。', ko: '교정할 때 가린 곳을 누르면 단어 하나를 1.2초 볼 수 있고, 한 번에 하나만 보입니다.', en: 'While correcting, tap the cover to see one word for 1.2 seconds — one at a time.'}},
  {id: 'resume', group: '记录', title: {zh: '随时离开', ko: '언제든 나가도 OK', en: 'Leave any time'}, text: {zh: '答到一半关掉页面也没关系，回来点「继续未完成的一轮」。', ko: '중간에 페이지를 닫아도 괜찮습니다. 돌아와서 ‘이어서 하기’를 누르세요.', en: 'Close the page mid-round if you like; come back and choose “Continue the unfinished round”.'}},
  {id: 'tabs', group: '记录', title: {zh: '多开也不乱', ko: '여러 탭도 안전', en: 'Safe across tabs'}, text: {zh: '同时开了两个页面，旧页面不会覆盖新页面的进度。', ko: '페이지를 두 개 열어도 오래된 쪽이 새 진행 상황을 덮어쓰지 않습니다.', en: 'With two tabs open, the older one can’t overwrite progress made in the newer one.'}},
  {id: 'flat', group: '其他', title: {zh: '平面盘', ko: '평면 레코드', en: 'Flat record'}, text: {zh: '设备不支持 3D 时，自动换成平面的盘，功能都在。', ko: '3D를 지원하지 않는 기기에서는 평면 레코드로 바뀌고, 기능은 그대로입니다.', en: 'On devices without 3D, it switches to a flat record with every feature intact.'}},
  {id: 'motion', group: '其他', title: {zh: '减少动态效果', ko: '동작 줄이기', en: 'Reduced motion'}, text: {zh: '系统里开了「减少动态效果」，网站的转场和动画会一起省掉。', ko: '시스템에서 ‘동작 줄이기’를 켜면 사이트의 전환과 애니메이션도 생략됩니다.', en: 'Turn on “Reduce motion” in your system and the site skips its transitions and animations too.'}},
  {id: 'playlist', group: '唱片', since: '2026-11-16c', title: {zh: '播放范围跟着讲次', ko: '재생 범위는 고른 강의', en: 'Plays your chosen lectures'}, text: {zh: '顺序和随机播放只放右侧勾选的讲次；顺序就是盘上由外到内、年份从早到晚。', ko: '순서대로·셔플 재생은 오른쪽에서 고른 강의만 재생합니다. 순서는 레코드 바깥에서 안쪽, 연도가 이른 곡부터입니다.', en: 'In-order and shuffle play only the lectures ticked on the right; “in order” runs from the outer edge inwards, oldest year first.'}},
  {id: 'mediakeys', group: '唱片', since: '2026-11-16c', title: {zh: '耳机和键盘也能切歌', ko: '이어폰·키보드로도 곡 넘기기', en: 'Headphone and media keys'}, text: {zh: '落针播放时，耳机按键、键盘上的播放键和手机锁屏控制都能暂停和切歌。', ko: '재생 중에는 이어폰 버튼, 키보드 재생 키, 휴대폰 잠금 화면에서도 일시정지와 곡 넘기기를 할 수 있습니다.', en: 'While a song plays, headphone buttons, keyboard media keys and your phone’s lock screen can pause and skip.'}},
  {id: 'lang', group: '其他', since: '2026-11-16c', title: {zh: '三种语言', ko: '3개 언어', en: 'Three languages'}, text: {zh: '右上角切换中文、한국어、English；歌名、人名的中韩英写法都在名字下方。', ko: '오른쪽 위에서 중국어·한국어·영어를 바꿀 수 있고, 곡명과 인명의 여러 표기는 이름 아래에 있습니다.', en: 'Switch between Chinese, Korean and English at the top right; the other spellings of song and artist names sit beneath each name.'}}
];

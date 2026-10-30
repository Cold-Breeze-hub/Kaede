/* ============================================================
   ACGN 聚合软件 · 静态原型 Mock 数据
   ------------------------------------------------------------
   数据约定（重要，改动前先读）：
   1) 只收录日本作品。美国漫画（漫威等）、国产游戏不在库内。
   2) og 字段只有四种取值，别再用「原作：漫画」这种半成品写法：
        '原作'     —— 本介质就是原作（漫画原作 / 小说原作 / 游戏原作）
        '原创'     —— 无上游原作的原创企划（原创动画、原创游戏）
        '漫画改' / '轻小说改' / '游戏改' / '小说改' —— 改编自其它介质
      界面文案由 originText() 生成：原作→「原作」，改编→「改编自 漫画」。
   3) 进度用 read 字段存数字（at=第几集/卷第几话），不再从字符串里猜。
   4) cover 指向本地已下载的封面图（assets/covers/<id>.jpg），下载脚本见
      tools/fetch_covers.py；缺图时自动回落到渐变占位。
   ============================================================ */

/* 底部四大区 → 第二行分类导航（等宽铺满） */
const PARTITIONS = [
  { id:'anime',  label:'动漫' },
  { id:'game',   label:'游戏' },
  { id:'manga',  label:'漫画' },
  { id:'novel',  label:'轻小说' },
  { id:'music',  label:'音乐' },
];

/* 系列中文名（用于典藏 / 系列页标题，避免取作品名首段） */
const SERIES_NAMES = {
  fate:'Fate', sg:'命运石之门', monogatari:'物语', mushoku:'无职转生', rezero:'Re:Zero',
  kaguya:'辉夜大小姐', frieren:'葬送的芙莉莲', aot:'进击的巨人', chainsaw:'电锯人',
  kimetsu:'鬼灭之刃', jujutsu:'咒术回战', spy:'间谍过家家', sao:'刀剑神域',
  index:'魔法禁书目录', jojo:'JoJo的奇妙冒险', gundam:'机动战士高达', haruhi:'凉宫春日',
  slime:'关于我转生变成史莱姆这档事', onepiece:'海贼王', conan:'名侦探柯南',
  naruto:'火影忍者', dragonball:'龙珠', spice:'狼与香辛料', overlord:'Overlord',
  p5:'女神异闻录5', eva:'新世纪福音战士', higurashi:'寒蝉鸣泣之时', dangan:'弹丸论破',
};

/* 生成集数（跨源拼图：深色=本地已有，浅色=在线） */
function makeEps(count, localFrom){
  const arr=[];
  for(let i=1;i<=count;i++){
    const local = i>=localFrom;
    const sources = local ? ['内置源A','本地文件','镜像B'] : ['内置源A','镜像B','网盘C'];
    arr.push({ n:i, local, sources });
  }
  return arr;
}
/* 游戏：单一「启动」入口 */
function gameEps(){ return [{ n:'启动', local:true, sources:['本地EXE'] }]; }
/* 生成卷/话 */
function makeVols(count, localFrom){
  const arr=[];
  for(let i=1;i<=count;i++){
    arr.push({ n:i, local:i>=localFrom, sources: i>=localFrom?['本地文件']:['内置源A','镜像B'] });
  }
  return arr;
}
/* 音乐专辑：曲目表 [{n,title,dur:'4:09'}] */
function makeTracks(list){ return list.map((t,i)=>({ n:i+1, title:t[0], dur:t[1] })); }
function coverOf(id){ return 'assets/covers/'+id+'.jpg'; }

/* 作品库（全部日本作品） */
const WORKS = [
  /* ===================== 动漫 ===================== */
  {
    id:'sg', name:'命运石之门', kind:'anime', kindLabel:'动漫', year:2011, quarter:2,
    tags:['科幻','时间旅行','烧脑'], accent:'#4FB3A6', og:'游戏改', series:'sg',
    local:true, shelfStatus:true, read:{at:5},
    intro:'自称疯狂科学家的冈部伦太郎，偶然发明了能向过去发送短信的「电话微波炉」，由此卷入一场围绕时间旅行与世界线的巨大阴谋。',
    episodes:makeEps(24, 14),
    production:{ '原作':'5pb. / Nitroplus', '监督':'佐藤卓哉', '动画制作':'WHITE FOX', '系列构成':'花田十辉' },
    cast:[ {role:'冈部伦太郎',actor:'宫野真守'}, {role:'牧濑红莉栖',actor:'今井麻美'} ],
    related:[ {type:'游戏',name:'命运石之门0'}, {type:'轻小说',name:'命运石之门 比翼恋理的爱人'} ],
  },
  {
    id:'frieren', name:'葬送的芙莉莲', kind:'anime', kindLabel:'动漫', year:2023, quarter:9,
    tags:['奇幻','治愈','冒险'], accent:'#C9A66B', og:'漫画改', series:'frieren',
    local:true, shelfStatus:true, read:{at:28, done:true},
    intro:'击败魔王后，精灵魔法使芙莉莲送别曾经的伙伴。为理解「人类」，她踏上前往魂之故乡的旅途。',
    episodes:makeEps(28, 1),
    production:{ '原作':'山田钟人 / 阿部司', '监督':'斋藤圭一郎', '动画制作':'MADHOUSE', '系列构成':'铃木智寻' },
    cast:[ {role:'芙莉莲',actor:'种崎敦美'}, {role:'费伦',actor:'市之濑加那'} ],
    related:[ {type:'漫画',name:'葬送的芙莉莲（漫画）'} ],
  },
  {
    id:'aot', name:'进击的巨人', kind:'anime', kindLabel:'动漫', year:2013, quarter:4,
    tags:['热血','战斗','悬疑'], accent:'#8C7B6B', og:'漫画改', series:'aot',
    local:false, shelfStatus:true, read:{at:12},
    intro:'人类被高墙隔绝于巨人的威胁之外。少年艾伦目睹母亲被吞，立誓驱逐所有巨人。',
    episodes:makeEps(25, 3),
    production:{ '原作':'谏山创', '监督':'荒木哲郎', '动画制作':'WIT STUDIO / MAPPA', '系列构成':'小林靖子' },
    cast:[ {role:'艾伦',actor:'梶裕贵'}, {role:'三笠',actor:'石川由依'} ],
    related:[ {type:'漫画',name:'进击的巨人（漫画）'} ],
  },
  {
    id:'chainsaw', name:'电锯人', kind:'anime', kindLabel:'动漫', year:2022, quarter:10,
    tags:['战斗','黑暗','热血'], accent:'#C2544F', og:'漫画改', series:'chainsaw',
    local:false, shelfStatus:true, read:{at:9},
    intro:'为还债沦为恶魔猎人的少年电次，与恶魔波奇塔合体，成为胸口装有电锯的「电锯人」。',
    episodes:makeEps(12, 2),
    production:{ '原作':'藤本树', '监督':'中山龙', '动画制作':'MAPPA', '系列构成':'濑古浩司' },
    cast:[ {role:'电次',actor:'户谷菊之介'}, {role:'玛奇玛',actor:'楠木灯'} ],
    related:[ {type:'漫画',name:'电锯人（漫画）'} ],
  },
  {
    id:'monogatari', name:'物语系列', kind:'anime', kindLabel:'动漫', year:2009, quarter:7,
    tags:['奇幻','对话剧','悬疑'], accent:'#AE83D6', og:'轻小说改', series:'monogatari',
    local:true, shelfStatus:true, read:{at:9},
    intro:'高三生阿良良木历在春假结识吸血鬼，自此不断卷入各色少女与怪异事件。以西尾维新的独特文体著称。',
    episodes:makeEps(30, 12),
    production:{ '原作':'西尾维新', '角色原案':'VOFAN', '动画制作':'SHAFT', '总监督':'新房昭之' },
    cast:[ {role:'阿良良木历',actor:'神谷浩史'}, {role:'战场原黑仪',actor:'斋藤千和'} ],
    related:[ {type:'轻小说',name:'物语系列（小说）'}, {type:'漫画',name:'物语系列（漫画）'} ],
  },
  {
    id:'mushoku', name:'无职转生', kind:'anime', kindLabel:'动漫', year:2021, quarter:1,
    tags:['奇幻','重生','冒险'], accent:'#6FA8C7', og:'轻小说改', series:'mushoku',
    local:true, shelfStatus:true, read:{at:13},
    intro:'34 岁无业死宅意外身亡后，转生到异世界成为鲁迪乌斯。带着前世记忆，他决心这辈子认真活一次。',
    episodes:makeEps(23, 18),
    production:{ '原作':'理不尽的太阳', '监督':'冈本学', '动画制作':'Studio Bind', '系列构成':'广田光毅' },
    cast:[ {role:'鲁迪乌斯',actor:'内山夕实'}, {role:'希露菲',actor:'茅野爱衣'} ],
    related:[ {type:'轻小说',name:'无职转生（小说）'} ],
  },
  {
    id:'rezero', name:'Re:从零开始的异世界生活', kind:'anime', kindLabel:'动漫', year:2016, quarter:4,
    tags:['奇幻','悬疑','战斗'], accent:'#D98C5F', og:'轻小说改', series:'rezero',
    local:false, shelfStatus:true, read:{at:8},
    intro:'便利店员菜月昴意外穿越到异世界，获得死亡后回到特定时间点的「死亡回归」能力，在绝望中一次次重来。',
    episodes:makeEps(25, 6),
    production:{ '原作':'长月达平', '监督':'渡边政治', '动画制作':'WHITE FOX', '系列构成':'横谷昌宏' },
    cast:[ {role:'菜月昴',actor:'小林裕介'}, {role:'爱蜜莉雅',actor:'高桥李依'} ],
    related:[ {type:'轻小说',name:'Re:Zero（小说）'} ],
  },
  {
    id:'kaguya', name:'辉夜大小姐想让我告白', kind:'anime', kindLabel:'动漫', year:2019, quarter:1,
    tags:['恋爱','喜剧','校园'], accent:'#D98CA8', og:'漫画改', series:'kaguya',
    local:true, shelfStatus:true, read:{at:24, done:true},
    intro:'学生会会长白银御行与副会长四宫辉夜，两个傲娇天才互相试探，企图让对方先告白。',
    episodes:makeEps(24, 1),
    production:{ '原作':'赤坂明', '监督':'畠山守', '动画制作':'A-1 Pictures', '系列构成':'中西泰博' },
    cast:[ {role:'白银御行',actor:'古川慎'}, {role:'四宫辉夜',actor:'古贺葵'} ],
    related:[ {type:'漫画',name:'辉夜大小姐（漫画）'} ],
  },
  {
    id:'fate_sn', name:'Fate/stay night [Heaven\'s Feel]', kind:'anime', kindLabel:'动漫', year:2017, quarter:10,
    tags:['奇幻','战斗','催泪'], accent:'#B98BD9', og:'游戏改', series:'fate',
    local:true, shelfStatus:true, read:{at:3, done:true},
    intro:'圣杯战争落幕之后，卫宫士郎与间桐樱在冬木的废墟中，迎来最残酷也最温柔的结局篇。',
    episodes:makeEps(3, 1),
    production:{ '原作':'TYPE-MOON', '监督':'须藤友德', '动画制作':'ufotable', '音乐':'梶浦由记' },
    cast:[ {role:'卫宫士郎',actor:'杉山纪彰'}, {role:'间桐樱',actor:'下屋则子'} ],
    related:[ {type:'游戏',name:'Fate/Grand Order'}, {type:'轻小说',name:'Fate/Zero'} ],
  },
  {
    id:'kimetsu_a', name:'鬼灭之刃', kind:'anime', kindLabel:'动漫', year:2019, quarter:4,
    tags:['热血','战斗','羁绊'], accent:'#2E8B9E', og:'漫画改', series:'kimetsu',
    local:true, shelfStatus:true, read:{at:26, done:true},
    intro:'家人被鬼杀害的炭治郎，为将妹妹祢豆子变回人类加入鬼杀队，与恶鬼展开死斗。',
    episodes:makeEps(26, 1),
    production:{ '原作':'吾峠呼世晴', '监督':'外崎春雄', '动画制作':'ufotable', '音乐':'梶浦由记 / 椎名豪' },
    cast:[ {role:'灶门炭治郎',actor:'花江夏树'}, {role:'灶门祢豆子',actor:'鬼头明里'} ],
    related:[ {type:'漫画',name:'鬼灭之刃（漫画）'} ],
  },
  {
    id:'jujutsu_a', name:'咒术回战', kind:'anime', kindLabel:'动漫', year:2020, quarter:10,
    tags:['战斗','黑暗','校园'], accent:'#7C6FA8', og:'漫画改', series:'jujutsu',
    local:false, shelfStatus:true, read:{at:24, done:true},
    intro:'吞下特级咒物「两面宿傩之指」的少年虎杖悠仁，被编入咒术高专，踏入诅咒与祓除的世界。',
    episodes:makeEps(24, 1),
    production:{ '原作':'芥见下下', '监督':'朴性厚', '动画制作':'MAPPA', '系列构成':'濑古浩司' },
    cast:[ {role:'虎杖悠仁',actor:'榎木淳弥'}, {role:'伏黑惠',actor:'内田雄马'} ],
    related:[ {type:'漫画',name:'咒术回战（漫画）'} ],
  },
  {
    id:'spy_a', name:'间谍过家家', kind:'anime', kindLabel:'动漫', year:2022, quarter:4,
    tags:['喜剧','日常','谍战'], accent:'#8FA76B', og:'漫画改', series:'spy',
    local:true, shelfStatus:true, read:{at:12, done:true},
    intro:'间谍「黄昏」为执行任务组建临时家庭，却不知妻子是杀手、女儿会读心，三人各自隐瞒身份过日子。',
    episodes:makeEps(12, 1),
    production:{ '原作':'远藤达哉', '监督':'古桥一浩', '动画制作':'WIT STUDIO / CloverWorks', '系列构成':'古桥一浩' },
    cast:[ {role:'劳埃德·福杰',actor:'江口拓也'}, {role:'阿尼亚·福杰',actor:'种崎敦美'} ],
    related:[ {type:'漫画',name:'间谍过家家（漫画）'} ],
  },
  {
    id:'sao_a', name:'刀剑神域', kind:'anime', kindLabel:'动漫', year:2012, quarter:7,
    tags:['奇幻','虚拟现实','战斗'], accent:'#5B8FC7', og:'轻小说改', series:'sao',
    local:false, shelfStatus:true, read:{at:25, done:true},
    intro:'一万名玩家被困在完全潜行 RPG 中，死亡即真的死亡。桐人握剑向上，试图打通这座浮游城。',
    episodes:makeEps(25, 1),
    production:{ '原作':'川原砾', '监督':'伊藤智彦', '动画制作':'A-1 Pictures', '音乐':'梶浦由记' },
    cast:[ {role:'桐人',actor:'松冈祯丞'}, {role:'亚丝娜',actor:'户松遥'} ],
    related:[ {type:'轻小说',name:'刀剑神域（小说）'} ],
  },
  {
    id:'index_a', name:'魔法禁书目录', kind:'anime', kindLabel:'动漫', year:2008, quarter:10,
    tags:['奇幻','超能力','战斗'], accent:'#C77B7B', og:'轻小说改', series:'index',
    local:false, shelfStatus:true, read:{at:18},
    intro:'学园都市的无能力者上条当麻，右手能抹消一切异能。他与修女茵蒂克丝相遇后，被卷进科学与魔法的交界。',
    episodes:makeEps(24, 1),
    production:{ '原作':'镰池和马', '监督':'锦织博', '动画制作':'J.C.STAFF', '系列构成':'赤星政尚' },
    cast:[ {role:'上条当麻',actor:'阿部敦'}, {role:'茵蒂克丝',actor:'井口裕香'} ],
    related:[ {type:'轻小说',name:'魔法禁书目录（小说）'}, {type:'漫画',name:'魔法禁书目录（漫画）'} ],
  },
  {
    id:'jojo_a', name:'JoJo的奇妙冒险', kind:'anime', kindLabel:'动漫', year:2012, quarter:10,
    tags:['战斗','群像','热血'], accent:'#9C7CB8', og:'漫画改', series:'jojo',
    local:false, shelfStatus:true, read:{at:26, done:true},
    intro:'乔斯达家族与石鬼面的百年因缘。从波纹到替身，每一代乔乔都在用自己的方式对抗命运。',
    episodes:makeEps(26, 1),
    production:{ '原作':'荒木飞吕彦', '监督':'津田尚克', '动画制作':'david production', '音乐':'岩崎琢' },
    cast:[ {role:'乔纳森·乔斯达',actor:'兴津和幸'}, {role:'迪奥·布兰度',actor:'子安武人'} ],
    related:[ {type:'漫画',name:'JoJo的奇妙冒险（漫画）'} ],
  },
  {
    id:'gundam_a', name:'机动战士高达', kind:'anime', kindLabel:'动漫', year:1979, quarter:4,
    tags:['科幻','机战','战争'], accent:'#6B8CA8', og:'原创', series:'gundam',
    local:false, shelfStatus:false,
    intro:'宇宙世纪 0079 年，少年阿姆罗偶然坐上联邦军的新型机动战士，被卷入一年战争的洪流。',
    episodes:makeEps(43, 20),
    production:{ '企划':'日升', '总监督':'富野由悠季', '角色设计':'安彦良和', '机械设计':'大河原邦男' },
    cast:[ {role:'阿姆罗·雷',actor:'古谷彻'}, {role:'夏亚·阿兹纳布尔',actor:'池田秀一'} ],
    related:[ {type:'漫画',name:'机动战士高达 THE ORIGIN'} ],
  },
  {
    id:'haruhi_a', name:'凉宫春日的忧郁', kind:'anime', kindLabel:'动漫', year:2006, quarter:4,
    tags:['校园','科幻','日常'], accent:'#E0A45F', og:'轻小说改', series:'haruhi',
    local:false, shelfStatus:false,
    intro:'「我对普通人类没有兴趣。」开学自我介绍上的一句话，让凉宫春日把 SOS 团凑齐，也让世界开始偏离常轨。',
    episodes:makeEps(14, 1),
    production:{ '原作':'谷川流', '监督':'石原立也', '动画制作':'京都动画', '系列构成':'志茂文彦' },
    cast:[ {role:'凉宫春日',actor:'平野绫'}, {role:'阿虚',actor:'杉田智和'} ],
    related:[ {type:'轻小说',name:'凉宫春日（小说）'} ],
  },
  {
    id:'eva_a', name:'新世纪福音战士', kind:'anime', kindLabel:'动漫', year:1995, quarter:10,
    tags:['科幻','机战','心理'], accent:'#8E6FA8', og:'原创', series:'eva',
    local:false, shelfStatus:false,
    intro:'第三次冲击后的近未来，少年碇真嗣被父亲召回，驾驶泛用人形决战兵器 EVA 迎战使徒。',
    episodes:makeEps(26, 8),
    production:{ '企划':'GAINAX', '总监督':'庵野秀明', '角色设计':'贞本义行', '机械设计':'山下育人' },
    cast:[ {role:'碇真嗣',actor:'绪方惠美'}, {role:'绫波丽',actor:'林原惠美'} ],
    related:[],
  },
  {
    id:'slime_a', name:'关于我转生变成史莱姆这档事', kind:'anime', kindLabel:'动漫', year:2018, quarter:10,
    tags:['奇幻','重生','建国'], accent:'#5FA8A0', og:'轻小说改', series:'slime',
    local:true, shelfStatus:true, read:{at:12},
    intro:'被随机杀人魔刺死的上班族三上悟，转生为史莱姆「利姆鲁」，在异世界靠吸收与拟态建立起自己的国家。',
    episodes:makeEps(24, 1),
    production:{ '原作':'伏濑', '监督':'菊地康仁', '动画制作':'8bit', '系列构成':'笔安一幸' },
    cast:[ {role:'利姆鲁',actor:'冈咲美保'}, {role:'静',actor:'花守由美里'} ],
    related:[ {type:'轻小说',name:'转生史莱姆（小说）'}, {type:'漫画',name:'转生史莱姆（漫画）'} ],
  },

  /* ===================== 游戏 ===================== */
  {
    id:'wb2', name:'白色相簿2', kind:'game', kindLabel:'游戏', year:2010, quarter:3,
    tags:['恋爱','剧情','催泪'], accent:'#9AA7C7', og:'原作', series:'',
    local:true, shelfStatus:true,
    intro:'冬马和纱、北原春希、小木曾雪菜，三人之间纠结了三年的青春恋曲。IC / CC 双线交织的文字冒险。',
    episodes:gameEps(),
    production:{ '剧本':'丸户史明', '原画':'中村毅', '发行':'Leaf' },
    cast:[ {role:'北原春希',actor:'水岛大宙'}, {role:'小木曾雪菜',actor:'米泽圆'} ],
    related:[],
  },
  {
    id:'higurashi', name:'寒蝉鸣泣之时', kind:'game', kindLabel:'游戏', year:2002, quarter:8,
    tags:['悬疑','恐怖','乡村'], accent:'#7BA05B', og:'原作', series:'higurashi',
    local:false, shelfStatus:true,
    intro:'每年六月，雏见泽村都会发生一人死亡一人消失的离奇事件。转校生圭一逐渐揭开村庄背后的真相。',
    episodes:gameEps(),
    production:{ '剧本':'龙骑士07', '发行':'07th Expansion' },
    cast:[ {role:'前原圭一',actor:'保志总一朗'}, {role:'龙宫礼奈',actor:'中原麻衣'} ],
    related:[],
  },
  {
    id:'fgo', name:'Fate/Grand Order', kind:'game', kindLabel:'游戏', year:2015, quarter:7,
    tags:['卡牌','养成','剧情'], accent:'#B98BD9', og:'原作', series:'fate',
    local:true, shelfStatus:true,
    intro:'人理存续保障机构迦勒底，召唤历代英灵（从者）穿越特异点，修补崩坏的人类史。',
    episodes:gameEps(),
    production:{ '原作':'TYPE-MOON', '开发':'DELiGHTWORKS / Lasengle', '发行':'Aniplex' },
    cast:[ {role:'藤丸立香',actor:'玩家'}, {role:'玛修·基列莱特',actor:'高桥李依'} ],
    related:[ {type:'动漫',name:'Fate/stay night [Heaven\'s Feel]'} ],
  },
  {
    id:'p5', name:'女神异闻录5', kind:'game', kindLabel:'游戏', year:2016, quarter:9,
    tags:['JRPG','校园','回合制'], accent:'#C24B4B', og:'原作', series:'p5',
    local:true, shelfStatus:true,
    intro:'转学到东京的高中生，白天是普通学生，夜里潜入人心的「殿堂」偷走扭曲的欲望，让恶人自白罪行。',
    episodes:gameEps(),
    production:{ '开发':'Atlus', '监督':'桥野桂', '音乐':'目黑将司' },
    cast:[ {role:'Joker',actor:'福山润'}, {role:'摩尔加纳',actor:'大谷育江'} ],
    related:[],
  },
  {
    id:'dangan', name:'弹丸论破', kind:'game', kindLabel:'游戏', year:2010, quarter:11,
    tags:['推理','悬疑','学园'], accent:'#C7A24F', og:'原作', series:'dangan',
    local:false, shelfStatus:true,
    intro:'被关进希望之峰学园的高中生们，被迫在「互相杀害」与「学级裁判」之间求生。',
    episodes:gameEps(),
    production:{ '开发':'Spike Chunsoft', '剧本':'小高和刚', '音乐':'高田雅史' },
    cast:[ {role:'苗木诚',actor:'绪方惠美'}, {role:'黑白熊',actor:'大山羡代'} ],
    related:[],
  },
  {
    id:'sg0', name:'命运石之门0', kind:'game', kindLabel:'游戏', year:2015, quarter:12,
    tags:['科幻','时间旅行','催泪'], accent:'#4FB3A6', og:'原作', series:'sg',
    local:false, shelfStatus:false,
    intro:'未能拯救「她」的那条世界线上，冈部放弃成为疯狂科学家，直到人工智能唤回他的执念。',
    episodes:gameEps(),
    production:{ '剧本':'林直孝', '原画':'huke', '发行':'5pb.' },
    cast:[ {role:'冈部伦太郎',actor:'宫野真守'}, {role:'椎名真帆',actor:'潘惠美'} ],
    related:[ {type:'动漫',name:'命运石之门'} ],
  },
  {
    id:'elden', name:'艾尔登法环', kind:'game', kindLabel:'游戏', year:2022, quarter:2,
    tags:['开放世界','类魂','奇幻'], accent:'#B07CC9', og:'原创', series:'',
    local:false, shelfStatus:false,
    intro:'半神陨落、碎星散落的交界地，褪色者循着指引收集大卢恩，登上艾尔登之王宝座。',
    episodes:gameEps(),
    production:{ '开发':'FromSoftware', '监督':'宫崎英高', '世界设定':'乔治·R·R·马丁' },
    cast:[ {role:'褪色者',actor:'玩家'}, {role:'梅琳娜',actor:'NPC'} ],
    related:[],
  },
  {
    id:'clannad', name:'CLANNAD', kind:'game', kindLabel:'游戏', year:2004, quarter:4,
    tags:['恋爱','催泪','日常'], accent:'#7FA8C9', og:'原创', series:'',
    local:false, shelfStatus:false,
    intro:'Key 的泣系代表作。不良少年冈崎朋也在坡道上遇见古河渚，一点点学会与人相处、与家人和解。',
    episodes:gameEps(),
    production:{ '剧本':'麻枝准', '原画':'樋上至', '发行':'Key' },
    cast:[ {role:'冈崎朋也',actor:'中村悠一'}, {role:'古河渚',actor:'中原麻衣'} ],
    related:[],
  },
  {
    id:'nier', name:'尼尔：机械纪元', kind:'game', kindLabel:'游戏', year:2017, quarter:3,
    tags:['动作','剧情','科幻'], accent:'#A89880', og:'原创', series:'',
    local:false, shelfStatus:false,
    intro:'人类已被逐出地表，寄叶部队的 2B、9S 与废弃工厂的 A2，在无人的战场上一遍遍追问「活着」的意义。',
    episodes:gameEps(),
    production:{ '开发':'PlatinumGames', '监督':'横尾太郎', '音乐':'冈部启一' },
    cast:[ {role:'2B',actor:'石川由依'}, {role:'9S',actor:'花江夏树'} ],
    related:[],
  },
  {
    id:'ff7r', name:'最终幻想VII 重制版', kind:'game', kindLabel:'游戏', year:2020, quarter:4,
    tags:['JRPG','动作','剧情'], accent:'#7E8FA8', og:'原作', series:'',
    local:false, shelfStatus:false,
    intro:'米德加尔的魔晄都市里，前神罗战士克劳德加入雪崩组织，与艾莉丝、蒂法一起对抗星球的掠夺者。',
    episodes:gameEps(),
    production:{ '开发':'Square Enix', '监督':'野村哲也', '音乐':'植松伸夫 / 滨涡正志' },
    cast:[ {role:'克劳德',actor:'樱井孝宏'}, {role:'艾莉丝',actor:'坂本真绫'} ],
    related:[],
  },
  {
    id:'p4g', name:'女神异闻录4 黄金版', kind:'game', kindLabel:'游戏', year:2012, quarter:2,
    tags:['JRPG','校园','悬疑'], accent:'#E0B84C', og:'原作', series:'',
    local:false, shelfStatus:false,
    intro:'转学到乡下小镇的鸣上悠，与同伴组成特别捜查队，从深夜电视里追查连环杀人案的真相。',
    episodes:gameEps(),
    production:{ '开发':'Atlus', '监督':'桥野桂', '音乐':'目黑将司' },
    cast:[ {role:'鸣上悠',actor:'浪川大辅'}, {role:'久慈川理世',actor:'钉宫理惠'} ],
    related:[],
  },
  {
    id:'p3r', name:'女神异闻录3 Reload', kind:'game', kindLabel:'游戏', year:2024, quarter:2,
    tags:['JRPG','校园','剧情'], accent:'#5C9BD6', og:'原作', series:'',
    local:false, shelfStatus:false,
    intro:'转入月光馆学园的少年，在「影时间」里觉醒人格面具，与同伴一同挑战塔耳塔罗斯的顶端。',
    episodes:gameEps(),
    production:{ '开发':'Atlus', '音乐':'目黑将司', '发行':'SEGA' },
    cast:[ {role:'结城理',actor:'石田彰'}, {role:'Aegis',actor:'坂本真绫'} ],
    related:[],
  },
  {
    id:'sekiro', name:'只狼：影逝二度', kind:'game', kindLabel:'游戏', year:2019, quarter:1,
    tags:['动作','硬核','和风'], accent:'#C26A4A', og:'原创', series:'',
    local:false, shelfStatus:false,
    intro:'战国末期的苇名，失去左臂的忍者「狼」带着义手重返故土，为守护主君向苇名一心挥刀。',
    episodes:gameEps(),
    production:{ '开发':'FromSoftware', '监督':'宫崎英高', '音乐':'北村友香' },
    cast:[ {role:'狼',actor:'浪川大辅'}, {role:'御子',actor:'佐藤美由希'} ],
    related:[],
  },
  {
    id:'octopath', name:'歧路旅人', kind:'game', kindLabel:'游戏', year:2018, quarter:3,
    tags:['JRPG','回合制','奇幻'], accent:'#C79A5B', og:'原创', series:'',
    local:false, shelfStatus:false,
    intro:'八位旅人，八段旅程。剑士、舞娘、药师、盗贼各自踏上奥鲁斯特拉大陆，在「破防」与「增幅」之间找到自己的答案。',
    episodes:gameEps(),
    production:{ '开发':'Acquire / Square Enix', '音乐':'西木康智' },
    cast:[ {role:'奥菲莉亚',actor:'-'}, {role:'泰里翁',actor:'-'} ],
    related:[],
  },

  /* ===================== 漫画 ===================== */
  {
    id:'aot_m', name:'进击的巨人（漫画）', kind:'manga', kindLabel:'漫画', year:2009, quarter:9,
    tags:['热血','战斗','悬疑'], accent:'#8C7B6B', og:'原作', series:'aot',
    local:true, shelfStatus:true, read:{at:34, done:true},
    intro:'谏山创连载十年的作品。墙内人类与巨人的真相，随着调查兵团的足迹逐步揭开。全 34 卷完结。',
    volumes:makeVols(34, 1),
    production:{ '作者':'谏山创', '出版社':'讲谈社', '连载杂志':'别册少年Magazine' },
    cast:[ {role:'艾伦',actor:'-'}, {role:'三笠',actor:'-'} ],
    related:[ {type:'动漫',name:'进击的巨人'} ],
  },
  {
    id:'chainsaw_m', name:'电锯人（漫画）', kind:'manga', kindLabel:'漫画', year:2018, quarter:12,
    tags:['战斗','黑暗','热血'], accent:'#C2544F', og:'原作', series:'chainsaw',
    local:false, shelfStatus:true, read:{at:15},
    intro:'藤本树笔下充满暴力与温情的恶魔猎人故事。电次与帕瓦、早川秋的搭档日常危机四伏。',
    volumes:makeVols(20, 2),
    production:{ '作者':'藤本树', '出版社':'集英社', '连载杂志':'周刊少年Jump+' },
    cast:[ {role:'电次',actor:'-'}, {role:'玛奇玛',actor:'-'} ],
    related:[ {type:'动漫',name:'电锯人'} ],
  },
  {
    id:'frieren_m', name:'葬送的芙莉莲（漫画）', kind:'manga', kindLabel:'漫画', year:2020, quarter:4,
    tags:['奇幻','治愈','冒险'], accent:'#C9A66B', og:'原作', series:'frieren',
    local:true, shelfStatus:true, read:{at:14, done:true},
    intro:'山田钟人原作、阿部司作画的治愈系奇幻。芙莉莲与搭档在旅途中的相遇与告别。',
    volumes:makeVols(14, 1),
    production:{ '原作':'山田钟人', '作画':'阿部司', '出版社':'小学馆' },
    cast:[ {role:'芙莉莲',actor:'-'}, {role:'费伦',actor:'-'} ],
    related:[ {type:'动漫',name:'葬送的芙莉莲'} ],
  },
  {
    id:'kaguya_m', name:'辉夜大小姐想让我告白（漫画）', kind:'manga', kindLabel:'漫画', year:2015, quarter:5,
    tags:['恋爱','喜剧','校园'], accent:'#D98CA8', og:'原作', series:'kaguya',
    local:true, shelfStatus:true, read:{at:28, done:true},
    intro:'赤坂明的恋爱喜剧。学生会里两个天才的攻防战，比谁先让对方告白。全 28 卷完结。',
    volumes:makeVols(28, 10),
    production:{ '作者':'赤坂明', '出版社':'集英社', '连载杂志':'周刊Young Jump' },
    cast:[ {role:'白银御行',actor:'-'}, {role:'四宫辉夜',actor:'-'} ],
    related:[ {type:'动漫',name:'辉夜大小姐想让我告白'} ],
  },
  {
    id:'fate_m', name:'Fate/Zero（漫画）', kind:'manga', kindLabel:'漫画', year:2011, quarter:2,
    tags:['奇幻','战斗','群像'], accent:'#B98BD9', og:'小说改', series:'fate',
    local:false, shelfStatus:true, read:{at:14, done:true},
    intro:'虚渊玄执笔的前传，由真じろう作画。第四次圣杯战争，七位御主与从者为愿望而厮杀。',
    volumes:makeVols(14, 3),
    production:{ '原作':'虚渊玄 / TYPE-MOON', '作画':'真じろう', '出版社':'角川书店' },
    cast:[ {role:'卫宫切嗣',actor:'-'}, {role:'吉尔伽美什',actor:'-'} ],
    related:[ {type:'动漫',name:'Fate/stay night [Heaven\'s Feel]'}, {type:'轻小说',name:'Fate/Zero'} ],
  },
  {
    id:'kimetsu', name:'鬼灭之刃（漫画）', kind:'manga', kindLabel:'漫画', year:2016, quarter:2,
    tags:['热血','战斗','羁绊'], accent:'#2E8B9E', og:'原作', series:'kimetsu',
    local:true, shelfStatus:true, read:{at:23, done:true},
    intro:'吾峠呼世晴的代表作。为把妹妹变回人类，炭治郎加入鬼杀队，与恶鬼展开死斗。全 23 卷完结。',
    volumes:makeVols(23, 4),
    production:{ '作者':'吾峠呼世晴', '出版社':'集英社', '连载杂志':'周刊少年Jump' },
    cast:[ {role:'灶门炭治郎',actor:'-'}, {role:'灶门祢豆子',actor:'-'} ],
    related:[ {type:'动漫',name:'鬼灭之刃'} ],
  },
  {
    id:'onepiece', name:'海贼王', kind:'manga', kindLabel:'漫画', year:1997, quarter:7,
    tags:['冒险','热血','群像'], accent:'#D96C4A', og:'原作', series:'onepiece',
    local:true, shelfStatus:true, read:{at:108},
    intro:'尾田荣一郎连载近三十年，单行本已过百卷。路飞为成为海贼王，带着草帽一伙驶向伟大航路。',
    volumes:makeVols(113, 100),
    production:{ '作者':'尾田荣一郎', '出版社':'集英社', '连载杂志':'周刊少年Jump' },
    cast:[ {role:'蒙奇·D·路飞',actor:'-'}, {role:'罗罗诺亚·佐罗',actor:'-'} ],
    related:[],
  },
  {
    id:'conan', name:'名侦探柯南', kind:'manga', kindLabel:'漫画', year:1994, quarter:1,
    tags:['推理','悬疑','日常'], accent:'#5C7FA8', og:'原作', series:'conan',
    local:false, shelfStatus:true, read:{at:60},
    intro:'高中生侦探工藤新一被灌下毒药变成小学生，化名江户川柯南，一桩桩案件背后是黑衣组织的影子。',
    volumes:makeVols(107, 60),
    production:{ '作者':'青山刚昌', '出版社':'小学馆', '连载杂志':'周刊少年Sunday' },
    cast:[ {role:'江户川柯南',actor:'-'}, {role:'毛利兰',actor:'-'} ],
    related:[],
  },
  {
    id:'jojo', name:'JoJo的奇妙冒险（漫画）', kind:'manga', kindLabel:'漫画', year:1987, quarter:1,
    tags:['战斗','群像','奇幻'], accent:'#9C7CB8', og:'原作', series:'jojo',
    local:false, shelfStatus:true, read:{at:132, done:true},
    intro:'荒木飞吕彦连载三十余年，九部正篇、单行本逾百卷。每一代乔斯达都在与命运搏斗。',
    volumes:makeVols(132, 100),
    production:{ '作者':'荒木飞吕彦', '出版社':'集英社', '连载杂志':'Ultra Jump' },
    cast:[ {role:'乔纳森·乔斯达',actor:'-'}, {role:'空条承太郎',actor:'-'} ],
    related:[ {type:'动漫',name:'JoJo的奇妙冒险'} ],
  },
  {
    id:'jujutsu_m', name:'咒术回战（漫画）', kind:'manga', kindLabel:'漫画', year:2018, quarter:3,
    tags:['战斗','黑暗','校园'], accent:'#7C6FA8', og:'原作', series:'jujutsu',
    local:false, shelfStatus:true, read:{at:30, done:true},
    intro:'芥见下下创作，全 30 卷完结。少年吞下诅咒之王的手指，从此站到人与咒灵的战场中央。',
    volumes:makeVols(30, 1),
    production:{ '作者':'芥见下下', '出版社':'集英社', '连载杂志':'周刊少年Jump' },
    cast:[ {role:'虎杖悠仁',actor:'-'}, {role:'五条悟',actor:'-'} ],
    related:[ {type:'动漫',name:'咒术回战'} ],
  },
  {
    id:'spy_m', name:'间谍过家家（漫画）', kind:'manga', kindLabel:'漫画', year:2019, quarter:3,
    tags:['喜剧','日常','谍战'], accent:'#8FA76B', og:'原作', series:'spy',
    local:true, shelfStatus:true, read:{at:15, done:true},
    intro:'远藤达哉的喜剧。间谍、杀手与超能力少女组成的假家庭，在任务与日常之间摇摇欲坠。',
    volumes:makeVols(15, 1),
    production:{ '作者':'远藤达哉', '出版社':'集英社', '连载杂志':'少年Jump+' },
    cast:[ {role:'劳埃德·福杰',actor:'-'}, {role:'约尔·福杰',actor:'-'} ],
    related:[ {type:'动漫',name:'间谍过家家'} ],
  },
  {
    id:'naruto', name:'火影忍者', kind:'manga', kindLabel:'漫画', year:1999, quarter:9,
    tags:['热血','忍者','羁绊'], accent:'#D98C4A', og:'原作', series:'naruto',
    local:false, shelfStatus:false,
    intro:'岸本齐史的代表作，全 72 卷。吊车尾忍者鸣人立志成为火影，与佐助的羁绊贯穿始终。',
    volumes:makeVols(72, 30),
    production:{ '作者':'岸本齐史', '出版社':'集英社', '连载杂志':'周刊少年Jump' },
    cast:[ {role:'漩涡鸣人',actor:'-'}, {role:'宇智波佐助',actor:'-'} ],
    related:[],
  },
  {
    id:'dragonball', name:'龙珠', kind:'manga', kindLabel:'漫画', year:1984, quarter:11,
    tags:['热血','战斗','冒险'], accent:'#E0A45F', og:'原作', series:'dragonball',
    local:true, shelfStatus:false,
    intro:'鸟山明的国民级作品，全 42 卷。从寻找龙珠到宇宙级战斗，少年悟空的成长是一整代人的起点。',
    volumes:makeVols(42, 1),
    production:{ '作者':'鸟山明', '出版社':'集英社', '连载杂志':'周刊少年Jump' },
    cast:[ {role:'孙悟空',actor:'-'}, {role:'贝吉塔',actor:'-'} ],
    related:[],
  },
  {
    id:'index_m', name:'魔法禁书目录（漫画）', kind:'manga', kindLabel:'漫画', year:2007, quarter:5,
    tags:['奇幻','超能力','战斗'], accent:'#C77B7B', og:'轻小说改', series:'index',
    local:false, shelfStatus:false,
    intro:'近木野中哉作画的漫画版，已出版 33 卷。学园都市里，右手能抹消异能的少年与魔法世界正面相撞。',
    volumes:makeVols(33, 1),
    production:{ '原作':'镰池和马', '作画':'近木野中哉', '出版社':'史克威尔艾尼克斯' },
    cast:[ {role:'上条当麻',actor:'-'}, {role:'茵蒂克丝',actor:'-'} ],
    related:[ {type:'动漫',name:'魔法禁书目录'}, {type:'轻小说',name:'魔法禁书目录（小说）'} ],
  },

  /* ===================== 轻小说 ===================== */
  {
    id:'monogatari_n', name:'物语系列（小说）', kind:'novel', kindLabel:'轻小说', year:2006, quarter:11,
    tags:['奇幻','对话','悬疑'], accent:'#AE83D6', og:'原作', series:'monogatari',
    local:true, shelfStatus:true, read:{at:6, ch:3},
    intro:'西尾维新以每年数册的节奏写下的长篇系列，VOFAN 插画。怪异、对话与青春的三重奏。',
    volumes:makeVols(30, 1),
    production:{ '作者':'西尾维新', '插画':'VOFAN', '出版社':'讲谈社BOX' },
    cast:[ {role:'阿良良木历',actor:'-'} ],
    related:[ {type:'动漫',name:'物语系列'}, {type:'漫画',name:'物语系列（漫画）'} ],
  },
  {
    id:'rezero_n', name:'Re:Zero（小说）', kind:'novel', kindLabel:'轻小说', year:2014, quarter:1,
    tags:['奇幻','异世界','悬疑'], accent:'#D98C5F', og:'原作', series:'rezero',
    local:false, shelfStatus:true, read:{at:18, ch:5},
    intro:'长月达平从 Web 连载走向文库的长篇，既刊 40 卷。死亡回归者的异世界求生记录。',
    volumes:makeVols(40, 5),
    production:{ '作者':'长月达平', '插画':'大塚真一郎', '出版社':'MF文库J' },
    cast:[ {role:'菜月昴',actor:'-'} ],
    related:[ {type:'动漫',name:'Re:从零开始的异世界生活'} ],
  },
  {
    id:'mushoku_n', name:'无职转生（小说）', kind:'novel', kindLabel:'轻小说', year:2014, quarter:1,
    tags:['奇幻','异世界','冒险'], accent:'#6FA8C7', og:'原作', series:'mushoku',
    local:true, shelfStatus:true, read:{at:12, ch:2},
    intro:'理不尽的太阳的异世界转生长篇，全 26 卷。鲁迪乌斯带着前世记忆，认真活出第二人生。',
    volumes:makeVols(26, 1),
    production:{ '作者':'理不尽的太阳', '插画':'シロタカ', '出版社':'MF Books' },
    cast:[ {role:'鲁迪乌斯',actor:'-'} ],
    related:[ {type:'动漫',name:'无职转生'} ],
  },
  {
    id:'fate_n', name:'Fate/Zero', kind:'novel', kindLabel:'轻小说', year:2006, quarter:12,
    tags:['奇幻','战斗','群像'], accent:'#B98BD9', og:'原作', series:'fate',
    local:false, shelfStatus:true, read:{at:4, done:true},
    intro:'虚渊玄执笔、武内崇插画，全 4 卷。第四次圣杯战争的真相与御主们的执念。',
    volumes:makeVols(4, 1),
    production:{ '作者':'虚渊玄', '插画':'武内崇', '出版社':'TYPE-MOON' },
    cast:[ {role:'卫宫切嗣',actor:'-'} ],
    related:[ {type:'动漫',name:'Fate/stay night [Heaven\'s Feel]'}, {type:'漫画',name:'Fate/Zero（漫画）'} ],
  },
  {
    id:'sg_n', name:'命运石之门 比翼恋理的爱人', kind:'novel', kindLabel:'轻小说', year:2012, quarter:8,
    tags:['科幻','恋爱','时间旅行'], accent:'#4FB3A6', og:'游戏改', series:'sg',
    local:true, shelfStatus:true, read:{at:2, ch:4},
    intro:'命运石之门的外传小说，聚焦冈部与红莉栖在另一条世界线中的日常与羁绊。',
    volumes:makeVols(3, 1),
    production:{ '原作':'5pb. / Nitroplus', '出版社':'ASCII Media Works' },
    cast:[ {role:'冈部伦太郎',actor:'-'}, {role:'牧濑红莉栖',actor:'-'} ],
    related:[ {type:'动漫',name:'命运石之门'}, {type:'游戏',name:'命运石之门0'} ],
  },
  {
    id:'sao_n', name:'刀剑神域（小说）', kind:'novel', kindLabel:'轻小说', year:2009, quarter:4,
    tags:['奇幻','异世界','战斗'], accent:'#5B8FC7', og:'原作', series:'sao',
    local:false, shelfStatus:true, read:{at:28, done:true},
    intro:'川原砾从 Web 连载起步的长篇，既刊 28 卷。从 SAO 到 Alicization，虚拟与现实的边界一再被推开。',
    volumes:makeVols(28, 1),
    production:{ '作者':'川原砾', '插画':'abec', '出版社':'电击文库' },
    cast:[ {role:'桐人',actor:'-'} ],
    related:[ {type:'动漫',name:'刀剑神域'} ],
  },
  {
    id:'index_n', name:'魔法禁书目录（小说）', kind:'novel', kindLabel:'轻小说', year:2004, quarter:4,
    tags:['奇幻','超能力','战斗'], accent:'#C77B7B', og:'原作', series:'index',
    local:true, shelfStatus:true, read:{at:30, ch:2},
    intro:'镰池和马执笔、灰村清孝插画。无印 22 卷、新约 23 卷、创约已出 15 卷，全系列逾 60 卷。',
    volumes:makeVols(62, 1),
    production:{ '作者':'镰池和马', '插画':'灰村清孝', '出版社':'电击文库' },
    cast:[ {role:'上条当麻',actor:'-'} ],
    related:[ {type:'动漫',name:'魔法禁书目录'}, {type:'漫画',name:'魔法禁书目录（漫画）'} ],
  },
  {
    id:'haruhi_n', name:'凉宫春日（小说）', kind:'novel', kindLabel:'轻小说', year:2003, quarter:6,
    tags:['校园','科幻','日常'], accent:'#E0A45F', og:'原作', series:'haruhi',
    local:false, shelfStatus:true, read:{at:12, done:true},
    intro:'谷川流执笔、伊东杂音插画，全 12 卷。SOS 团的日常，其实是世界存续的平衡点。',
    volumes:makeVols(12, 1),
    production:{ '作者':'谷川流', '插画':'伊东杂音', '出版社':'角川Sneaker文库' },
    cast:[ {role:'凉宫春日',actor:'-'} ],
    related:[ {type:'动漫',name:'凉宫春日的忧郁'} ],
  },
  {
    id:'slime_n', name:'转生史莱姆（小说）', kind:'novel', kindLabel:'轻小说', year:2013, quarter:5,
    tags:['奇幻','异世界','建国'], accent:'#5FA8A0', og:'原作', series:'slime',
    local:true, shelfStatus:true, read:{at:14, ch:1},
    intro:'伏濑的网络小说转出版物，既刊 22 卷。史莱姆利姆鲁在异世界一步步建立一个多族共存的国家。',
    volumes:makeVols(22, 1),
    production:{ '作者':'伏濑', '插画':'みっつばー', '出版社':'Micro Magazine' },
    cast:[ {role:'利姆鲁',actor:'-'} ],
    related:[ {type:'动漫',name:'关于我转生变成史莱姆这档事'}, {type:'漫画',name:'转生史莱姆（漫画）'} ],
  },
  {
    id:'spice_n', name:'狼与香辛料', kind:'novel', kindLabel:'轻小说', year:2006, quarter:2,
    tags:['奇幻','旅行','经济'], accent:'#C7A24F', og:'原作', series:'spice',
    local:false, shelfStatus:false,
    intro:'支仓冻砂的长篇，全 21 卷。行商罗伦斯与狼神赫萝沿着中世纪商路，一边做生意一边找故乡。',
    volumes:makeVols(21, 1),
    production:{ '作者':'支仓冻砂', '插画':'文仓十', '出版社':'电击文库' },
    cast:[ {role:'克拉福·罗伦斯',actor:'-'}, {role:'赫萝',actor:'-'} ],
    related:[],
  },
  {
    id:'overlord_n', name:'Overlord', kind:'novel', kindLabel:'轻小说', year:2012, quarter:7,
    tags:['奇幻','异世界','群像'], accent:'#8B6FA8', og:'原作', series:'overlord',
    local:false, shelfStatus:false,
    intro:'丸山くがね的作品，既刊 18 卷。游戏停服那刻，骷髅法师安兹留在了异世界，成了纳萨力克的主人。',
    volumes:makeVols(18, 1),
    production:{ '作者':'丸山くがね', '插画':'so-bin', '出版社':'Enterbrain' },
    cast:[ {role:'安兹·乌尔·恭',actor:'-'}, {role:'雅儿贝德',actor:'-'} ],
    related:[],
  },

  /* ===================== 音乐（二次元 / 日本） =====================
     音乐既不是"剧集"也不是"卷"，只有曲目表；不记进度（与游戏同）。
     og 一律留空：OST 依附动画、同人专辑本就是原创，谈"来源"只会写错。
     专辑名 / 歌手 / 曲目都对齐 iTunes 日本区真实在售的版本（封面也是从那里抓的），
     不写"记忆里的名字"——否则会出现"名对不上封面"的假数据。 */
  {
    id:'lisa_oath', name:'oath sign', kind:'music', kindLabel:'音乐', year:2011, quarter:11,
    tags:['动画 OP','摇滚'], accent:'#C4463A', og:'', series:'fate',
    local:true, shelfStatus:true,
    artist:'LiSA', albumType:'单曲专辑',
    intro:'《Fate/Zero》第一季片头曲。LiSA 用凌厉的摇滚底色唱出「为了守护而挥剑」的决意，也是她个人出道的代表作之一。',
    tracks:makeTracks([['oath sign','4:09'],['モノクロ','4:03'],['覚醒','3:52'],['crossing field -Acoustic ver.-','5:01']]),
    production:{ '演唱':'LiSA', '作词':'渡边翔', '作曲':'渡边翔', '发行':'Aniplex' },
    cast:[], related:[],
  },
  {
    id:'fz_ost', name:'Fate/Zero Original Soundtrack', kind:'music', kindLabel:'音乐', year:2011, quarter:10,
    tags:['动画OST','电子'], accent:'#6B4E8C', og:'', series:'fate',
    local:true, shelfStatus:false,
    artist:'梶浦由記', albumType:'OST',
    intro:'梶浦由记用合唱、弦乐与电子织出的圣杯战争底色。同名主题动机在整张碟里反复变形，是 2010 年代动画配乐的高峰之一。',
    tracks:makeTracks([
      ['point zero','2:14'],['let the stars fall down','3:22'],['the battle is to the strong','3:48'],
      ['dogfight','3:11'],['nervous','2:36'],['mysterious','3:02'],['painful','2:48'],
      ['the world is tumbling down','4:06'],['lights','3:19'],['grief','3:55'],
      ['the dream is...','4:22'],['sword of the king','3:37'],['the end of finality','5:12'],['oath sign -instrumental-','4:08'],
    ]),
    production:{ '作曲':'梶浦由記', '编曲':'梶浦由記', '发行':'Aniplex' },
    cast:[], related:[],
  },
  {
    id:'aimer_brave', name:'Brave Shine', kind:'music', kindLabel:'音乐', year:2015, quarter:7,
    tags:['动画 OP','治愈'], accent:'#3F6C8E', og:'', series:'fate',
    local:false, shelfStatus:true,
    artist:'Aimer', albumType:'单曲专辑',
    intro:'《Fate/stay night [Unlimited Blade Works]》第二季片头曲。Aimer 沙哑的中低音把「伤痕也是勋章」唱得很克制。',
    tracks:makeTracks([['Brave Shine','4:12'],['君を待ってる','4:32'],['小さな星のメロディー','4:47'],['Brave Shine -instrumental-','4:10']]),
    production:{ '演唱':'Aimer', '作词':'aimerrhythm', '作曲':'飛内将大', '发行':'SME Records' },
    cast:[], related:[],
  },
  {
    id:'aot_ost', name:'TVアニメ「進撃の巨人」Season 2 オリジナルサウンドトラック', kind:'music', kindLabel:'音乐', year:2017, quarter:4,
    tags:['动画OST','电子'], accent:'#8C5A3C', og:'', series:'aot',
    local:true, shelfStatus:true,
    artist:'澤野弘之', albumType:'OST',
    intro:'泽野弘之的标志性作品。德语合唱 + 交响 + 电子鼓组，把「人类被巨人逼到墙角」的绝望感推到极致。',
    tracks:makeTracks([
      ['attack on titan','4:24'],['ətˈæk 0N tάɪtn','4:24'],['The Reluctant Heroes','4:34'],
      ['counterattack-mankind','4:12'],['Vogel im Käfig','5:04'],['eye-water','3:22'],
      ['DOA','3:24'],['立body機motion','3:44'],['call your name','4:08'],
      ['Bauklötze','3:48'],['14字の伝言','2:12'],['army⇒G♂','3:26'],
    ]),
    production:{ '作曲':'澤野弘之', '编曲':'澤野弘之', '发行':'Pony Canyon' },
    cast:[], related:[],
  },
  {
    id:'chainsaw_ost', name:'Chainsaw Man Original Soundtrack Complete Edition', kind:'music', kindLabel:'音乐', year:2022, quarter:12,
    tags:['动画OST','电子'], accent:'#B5432F', og:'', series:'chainsaw',
    local:false, shelfStatus:false,
    artist:'牛尾憲輔', albumType:'OST',
    intro:'牛尾宪辅把整部《电锯人》做成了一台低频机器：极简的合成器动机、突然的静音，比任何旋律都更贴那股脏兮兮的日常感。',
    tracks:makeTracks([
      ['chainsaw','2:38'],['the devil','3:05'],['blood','2:52'],['denji','3:26'],
      ['a new life','2:41'],['bang','2:14'],['morning','3:09'],['old town','2:57'],
      ['first kill','3:33'],['chainsaw -slow-','4:11'],['goodbye','3:48'],['theme of chainsaw','5:02'],
    ]),
    production:{ '作曲':'牛尾憲輔', '发行':'Sony Music' },
    cast:[], related:[],
  },
  {
    id:'haruhi_ost', name:'涼宮ハルヒの完奏 ～コンプリートサウンドトラック～', kind:'music', kindLabel:'音乐', year:2006, quarter:7,
    tags:['动画OST','治愈'], accent:'#7E9BD1', og:'', series:'haruhi',
    local:false, shelfStatus:true,
    artist:'神前暁', albumType:'OST',
    intro:'神前晓的日常系配乐范本。轻快的木管与校园钟声，把「SOS 团的午后」写成了一种可以反复回放的天气。',
    tracks:makeTracks([
      ['ハルヒの憂鬱','1:42'],['日常のあさ','2:08'],['SOS団、参上','2:31'],
      ['お昼休み','1:58'],['長門有希','2:44'],['朝倉涼子','2:12'],
      ['放課後','3:05'],['涼宮ハルヒの憂鬱 -piano-','3:22'],['神人','2:26'],
      ['エンドレスエイト','3:11'],['いつもの風景','2:03'],['God knows... -inst-','4:38'],
    ]),
    production:{ '作曲':'神前暁', '发行':'Lantis' },
    cast:[], related:[],
  },
  {
    id:'eva_ost', name:'NEON GENESIS EVANGELION SOUNDTRACK 25th ANNIVERSARY BOX', kind:'music', kindLabel:'音乐', year:1995, quarter:10,
    tags:['动画OST','治愈'], accent:'#5C5F8C', og:'', series:'eva',
    local:true, shelfStatus:true,
    artist:'鷺巣詩郎 / Various Artists', albumType:'OST',
    intro:'鹭巢诗郎写下的第三新东京市。巴洛克式的弦乐、突然的军鼓、以及那首永远在关键时刻响起的「Decisive Battle」。',
    tracks:makeTracks([
      ['残酷な天使のテーゼ (TV Size)','1:32'],['EVA-01','3:12'],['Decisive Battle','2:24'],
      ['Angel Attack','2:37'],['NERV','2:52'],['rei','3:05'],
      ['asuka','2:48'],['misato','3:14'],['BORDERLINE','2:36'],
      ['Thanatos','3:28'],['FLY ME TO THE MOON','4:32'],['閉塞の拡大','3:41'],
    ]),
    production:{ '作曲':'鷺巣詩郎', '发行':'King Records' },
    cast:[], related:[],
  },
  {
    id:'fripside_railgun', name:'only my railgun (Version 2020)', kind:'music', kindLabel:'音乐', year:2020, quarter:4,
    tags:['动画 OP','摇滚'], accent:'#3F7FBF', og:'', series:'index',
    local:false, shelfStatus:true,
    artist:'fripSide', albumType:'单曲专辑',
    intro:'《某科学的超电磁炮》片头曲的 2020 重录版。高速合成器前奏一响，所有「电磁炮」二创视频都有了统一开场。',
    tracks:makeTracks([['only my railgun (Version 2020)','4:16'],['Late in autumn','4:35'],['only my railgun -instrumental-','4:14']]),
    production:{ '演唱':'fripSide', '作词':'八木沼悟志 / yuki-ka', '作曲':'八木沼悟志', '发行':'NBC 环球' },
    cast:[], related:[],
  },
  {
    id:'supercell_kimi', name:'君の知らない物語', kind:'music', kindLabel:'音乐', year:2009, quarter:7,
    tags:['动画 OP','摇滚'], accent:'#6E8FA8', og:'', series:'monogatari',
    local:true, shelfStatus:false,
    artist:'supercell', albumType:'单曲专辑',
    intro:'《化物语》片尾曲。ryo 写的「夏天的星空与回不去的告白」，让这首歌成了 2009 年之后所有告白场景的默认 BGM。',
    tracks:makeTracks([['君の知らない物語','5:42'],['LOVE & ROLL','4:22'],['君の知らない物語 -instrumental-','5:40']]),
    production:{ '演唱':'supercell', '作词':'ryo', '作曲':'ryo', '发行':'Sony Music' },
    cast:[], related:[],
  },
  {
    id:'kessoku_band', name:'結束バンド', kind:'music', kindLabel:'音乐', year:2022, quarter:12,
    tags:['摇滚','治愈'], accent:'#D8743F', og:'', series:'',
    local:true, shelfStatus:true,
    artist:'結束バンド', albumType:'专辑',
    intro:'《孤独摇滚！》的剧中乐队首张专辑。从「青春コンプレックス」到「星座になれたら」，把社恐少女的独白全塞进了失真吉他里。',
    tracks:makeTracks([
      ['青春コンプレックス','4:02'],['Distortion!!','3:38'],['カラカラ','4:12'],
      ['ギターと孤独と蒼い惑星','4:28'],['あのバンド','4:05'],['なにが悪い','3:52'],
      ['歌うたいのバラッド','4:36'],['ラブソングが歌えない','3:48'],['小さな海','4:14'],
      ['星座になれたら','5:06'],['フラッシュバッカー','4:22'],['転がる岩、君に朝が降る','4:44'],
    ]),
    production:{ '演唱':'結束バンド', '发行':'Aniplex' },
    cast:[], related:[],
  },
  {
    id:'yoasobi_idol', name:'アイドル', kind:'music', kindLabel:'音乐', year:2023, quarter:4,
    tags:['动画 OP','电子'], accent:'#C74E8B', og:'', series:'',
    local:false, shelfStatus:true,
    artist:'YOASOBI', albumType:'单曲专辑',
    intro:'《【推しの子】》片头曲。ikura 的高音与 Ayase 的电子编曲把「偶像」拆成谎言与爱两半，是 2023 年传播最广的动画歌曲。',
    tracks:makeTracks([['アイドル','3:33'],['アイドル -instrumental-','3:32'],['夜に駆ける -Live ver.-','4:28']]),
    production:{ '演唱':'YOASOBI', '作词':'Ayase', '作曲':'Ayase', '发行':'Sony Music' },
    cast:[], related:[],
  },
  {
    id:'deco_rabbit', name:'Rabbit Hole', kind:'music', kindLabel:'音乐', year:2022, quarter:8,
    tags:['Vocaloid','电子'], accent:'#9B5FC0', og:'', series:'',
    local:true, shelfStatus:false,
    artist:'DECO*27 feat. 初音ミク', albumType:'专辑',
    intro:'DECO*27 的电子舞曲路线代表作。初音的声线被切成碎片再拼回去，副歌一响就是短视频里的标准循环。',
    tracks:makeTracks([['Rabbit Hole','2:58'],['ヴァンパイア','3:06'],['animal','3:12'],['needLe','3:24'],['シンセカイ','3:18']]),
    production:{ '作词':'DECO*27', '作曲':'DECO*27', '发行':'U/M/A/A' },
    cast:[], related:[],
  },
  {
    id:'hachi_matryoshka', name:'Official Orange', kind:'music', kindLabel:'音乐', year:2010, quarter:8,
    tags:['Vocaloid','电子'], accent:'#D14B4B', og:'', series:'',
    local:false, shelfStatus:false,
    artist:'ハチ', albumType:'专辑',
    intro:'米津玄师以「ハチ」名义发表的第一张专辑，《マトリョシカ》就收在这里。快速的念白、俄罗斯套娃式的重复结构，是 2010 年「ボカロ」黄金期的声音标本。',
    tracks:makeTracks([['マトリョシカ','3:16'],['パンダヒーロー','3:42'],['結ンデ開イテ羅刹ト骸','4:08'],['砂の惑星','4:02']]),
    production:{ '作词':'ハチ', '作曲':'ハチ', '发行':'Balcony' },
    cast:[], related:[],
  },
  {
    id:'mitchie_freely', name:'FREELY TOMORROW feat. 初音ミク', kind:'music', kindLabel:'音乐', year:2011, quarter:7,
    tags:['Vocaloid','电子'], accent:'#4FA3C7', og:'', series:'',
    local:false, shelfStatus:false,
    artist:'mitchie M', albumType:'专辑',
    intro:'被称作「最像人声的初音」。mitchie M 用极强的调声把电子合成音唱出了呼吸感，是 Vocaloid 调教技术的分水岭。',
    tracks:makeTracks([['FREELY TOMORROW','3:48'],['ビバハピ','3:32'],['アゲアゲアゲイン','3:44'],['イージーデンス','3:26']]),
    production:{ '作词':'mitchie M', '作曲':'mitchie M', '发行':'KARENT' },
    cast:[], related:[],
  },
  {
    id:'touhou_utage', name:'宴 -Utage-', kind:'music', kindLabel:'音乐', year:2012, quarter:8,
    tags:['同人音乐','治愈'], accent:'#8E6B3F', og:'', series:'',
    local:true, shelfStatus:false,
    artist:'凋叶棕', albumType:'同人专辑',
    intro:'东方 Project 同人社团凋叶棕的代表作之一。以「和」为底色重编原曲，人声与三味线交织，是同人音乐里少见的叙事感。',
    tracks:makeTracks([['宴','4:12'],['幻想の果て','3:58'],['月と花','4:26'],['紅い月','3:44'],['宴 -off vocal-','4:10']]),
    production:{ '社团':'凋叶棕', '编曲':'RD-Sounds', '发行':'例大祭' },
    cast:[], related:[],
  },
  {
    id:'touhou_tsuki', name:'Tsukiyogatari', kind:'music', kindLabel:'音乐', year:2014, quarter:8,
    tags:['同人音乐','治愈'], accent:'#7FB39B', og:'', series:'',
    local:false, shelfStatus:false,
    artist:'Foxtail-Grass Studio', albumType:'同人专辑',
    intro:'把东方原曲拆成钢琴与木吉他的室内乐。适合当作业 BGM —— 不抢戏，但每次循环到第三遍都会突然听出新的声部。',
    tracks:makeTracks([['月夜がたり','3:52'],['昼下がりの魔法','4:06'],['風の通り道','3:38'],['小さな図書館','4:24'],['月夜がたり -piano-','4:02']]),
    production:{ '社团':'Foxtail-Grass Studio', '编曲':'ハム', '发行':'例大祭' },
    cast:[], related:[],
  },
  {
    id:'touhou_violin', name:'TOUHOU VIOLIN ROCK AYAKASHI -東方妖々夢-', kind:'music', kindLabel:'音乐', year:2010, quarter:8,
    tags:['同人音乐','摇滚'], accent:'#B37FA8', og:'', series:'',
    local:false, shelfStatus:false,
    artist:'TAMUSIC', albumType:'同人专辑',
    intro:'TAMUSIC 用双小提琴把《东方妖々梦》整作原曲重写成摇滚编制。「幽雅に咲かせ、墨染の桜」在弦乐齐奏下完全是另一种锋利。',
    tracks:makeTracks([
      ['妖々夢 ～ Snow or Cherry Petal','1:52'],['無何有の郷 ～ Deep Mountain','2:48'],
      ['遠野幻想物語','2:36'],['天空の花の都','3:04'],['幽霊楽団 ～ Phantom Ensemble','2:52'],
      ['アルティメットトゥルース','2:26'],['幽雅に咲かせ、墨染の桜 ～ Border of Life','3:18'],['さくらさくら ～ Japanize Dream...','3:44'],
    ]),
    production:{ '社团':'TAMUSIC', '编曲':'TAM', '发行':'例大祭' },
    cast:[], related:[],
  },
  {
    id:'drama_kase', name:'「あさがおと加瀬さん。」カバーソング&オーディオドラマアルバム', kind:'music', kindLabel:'音乐', year:2018, quarter:6,
    tags:['广播剧','治愈'], accent:'#7FA88E', og:'', series:'',
    local:false, shelfStatus:false,
    artist:'山田結衣(CV:高橋未奈美) & 加瀬友香(CV:佐倉綾音)', albumType:'广播剧',
    intro:'百合日常漫画原作的翻唱 + 广播剧专辑。两位主角的声线从对白到合唱都保持着「同班同学的距离感」，是这类专辑里少见的分寸。',
    tracks:makeTracks([['オーディオドラマ 第一话 朝顔と夏休み','16:24'],['オーディオドラマ 第二话 文化祭の夜','18:06'],['カバーソング メドレー','8:32']]),
    production:{ '原作':'高嶋ひろみ', '发行':'Aniplex' },
    cast:[], related:[],
  },
  {
    id:'drama_hakuoki', name:'薄桜鬼 ドラマCD ～会津隠密帳～', kind:'music', kindLabel:'音乐', year:2010, quarter:9,
    tags:['广播剧'], accent:'#8C4A5B', og:'', series:'',
    local:false, shelfStatus:false,
    artist:'V.A.', albumType:'广播剧',
    intro:'乙女向游戏《薄桜鬼》的衍生广播剧。新选组在会津的暗线任务，全程靠对白与刀声推进，是这类 CD 的典型形态。',
    tracks:makeTracks([['第一話 潜伏','14:38'],['第二話 隊士の夜','16:12'],['第三話 会津の雪','15:44']]),
    production:{ '原作':'オトメイト', '发行':'Idea Factory' },
    cast:[], related:[],
  },
  {
    id:'drama_yoru', name:'オーディオドラマ『夜に駆ける』', kind:'music', kindLabel:'音乐', year:2021, quarter:3,
    tags:['广播剧','治愈'], accent:'#4F6B8E', og:'', series:'',
    local:false, shelfStatus:false,
    artist:'伊東健人, 楠木ともり, 細谷佳正 & 木村昴', albumType:'广播剧',
    intro:'把 YOASOBI 的原曲改写成有声剧。没有旋律，只有四个人在夜里对话，反而让那句「沈むように溶けてゆくように」更具体了。',
    tracks:makeTracks([['第一夜','12:26'],['第二夜','13:48'],['第三夜','11:52']]),
    production:{ '原作':'星野舞夜', '发行':'Sony Music' },
    cast:[], related:[],
  },
];

/* 封面：本地已下载的真实封面（assets/covers/<id>.jpg） */
WORKS.forEach(w=>{ w.cover = coverOf(w.id); });

/* 作品区：分区即标题（不再单设页面标题） */
const SHELF_TITLE = {
  anime:'我的追番', game:'我的游戏', manga:'我的追漫', novel:'轻小说书架', music:'我的音乐',
};

/* 下载队列（演示） */
const DOWNLOADS = [
  { work:'sg',        name:'命运石之门 S01E05', pct:62,  speed:'1.2 MB/s', status:'downloading' },
  { work:'mushoku',   name:'无职转生 S02E13',   pct:100, speed:'', status:'done' },
  { work:'rezero',    name:'Re:Zero S02E08',    pct:38,  speed:'0.8 MB/s', status:'downloading' },
  { work:'monogatari',name:'物语系列 EP09',     pct:0,   speed:'', status:'failed' },
  { work:'onepiece',  name:'海贼王 第 100 卷',   pct:100, speed:'', status:'done' },
];
const DL_FILTERS = ['全部','下载中','已暂停','完成','失败'];

/* 工具：取作品 */
function getWork(id){ return WORKS.find(w=>w.id===id); }
/* 工具：同一系列的作品 */
function getSeriesWorks(seriesId){ return WORKS.filter(w=>w.series===seriesId); }

/* 我的 → 各功能页 */
const PANEL_PAGES = {
  history:{ title:'浏览历史' },
  relations:{ title:'作品关系' },
  sources:{ title:'源管理' },
  engines:{ title:'引擎管理' },
  backup:{ title:'同步备份' },
  rules:{ title:'命名规则' },
  playback:{ title:'播放设置' },
  danmaku:{ title:'弹幕设置' },
  notify:{ title:'通知' },
};

/* 功能页里的设置行：toggle=开关 / value=可点切换的取值 / action=按钮 */
const PANEL_ROWS = {
  sources:[
    { k:'builtin', label:'内置源 A', desc:'在线播放源 · 1080P', type:'toggle', def:true },
    { k:'mirror',  label:'镜像源 B', desc:'在线播放源 · 720P', type:'toggle', def:true },
    { k:'cloud',   label:'网盘源 C', desc:'需登录 · 仅在失败时回落到此', type:'toggle', def:false },
    { k:'local',   label:'本地文件源', desc:'扫描已下载目录', type:'toggle', def:true },
    { k:'timeout', label:'单源连接超时', desc:'超时后自动切下一个源', type:'value', opts:['5 秒','10 秒','20 秒'], def:1 },
  ],
  engines:[
    { k:'mpv',   label:'mpv 内核', desc:'硬解优先 · 推荐', type:'toggle', def:true },
    { k:'exo',   label:'ExoPlayer', desc:'移动端兼容性更好', type:'toggle', def:true },
    { k:'hw',    label:'硬件解码', desc:'省电，个别编码可能花屏', type:'toggle', def:true },
    { k:'soft',  label:'解码失败自动软解', type:'toggle', def:true },
  ],
  backup:[
    { k:'auto',    label:'自动备份', desc:'每 24 小时一次', type:'toggle', def:true },
    { k:'index',   label:'包含本地资源索引', type:'toggle', def:false },
    { k:'now',     label:'本地备份', desc:'上次备份 2026-10-29 09:12', type:'action', act:'立即备份' },
    { k:'restore', label:'从备份恢复', desc:'会覆盖当前收藏与进度', type:'action', act:'选择文件' },
  ],
  rules:[
    { k:'rename', label:'规范重命名', desc:'{作品名} S{季}E{集} {标题}', type:'toggle', def:true },
    { k:'lang',   label:'优先字幕语言', type:'value', opts:['简体中文','繁体中文','日语'], def:0 },
    { k:'cover',  label:'写入封面到文件夹', type:'toggle', def:true },
    { k:'nfo',    label:'同时生成 .nfo', type:'toggle', def:false },
  ],
  playback:[
    { k:'speed',  label:'默认倍速', type:'value', opts:['1.0x','1.25x','1.5x'], def:0 },
    { k:'resume', label:'记住播放进度', type:'toggle', def:true },
    { k:'next',   label:'自动连播下一集', type:'toggle', def:true },
    { k:'skip',   label:'跳过片头片尾', desc:'片头 90 秒 · 片尾 60 秒', type:'toggle', def:false },
  ],
  danmaku:[
    { k:'on',      label:'默认开启弹幕', type:'toggle', def:true },
    { k:'opacity', label:'弹幕透明度', type:'value', opts:['40%','70%','100%'], def:1 },
    { k:'size',    label:'弹幕字号', type:'value', opts:['小','中','大'], def:1 },
    { k:'shield',  label:'关键词屏蔽', desc:'已添加 6 个关键词', type:'action', act:'管理' },
  ],
  notify:[
    { k:'update', label:'追番更新提醒', type:'toggle', def:true },
    { k:'dl',     label:'下载完成提醒', type:'toggle', def:true },
    { k:'quiet',  label:'免打扰时段', desc:'23:00 – 08:00', type:'toggle', def:true },
  ],
  general:[
    { k:'lang',   label:'界面语言', type:'value', opts:['简体中文','繁體中文','English'], def:0 },
    { k:'startup',label:'启动页', type:'value', opts:['首页','作品区','上次离开的页面'], def:0 },
    { k:'default',label:'默认分区', type:'value', opts:['动漫','游戏','漫画','轻小说'], def:0 },
  ],
};

/* 浏览历史（演示） */
const HISTORY = [
  { work:'sg',        when:'今天 14:20', prog:'第 5 集 · 21%' },
  { work:'mushoku',   when:'昨天 22:05', prog:'第 13 集 · 57%' },
  { work:'aot_m',     when:'昨天 19:40', prog:'第 34 卷 · 已读完' },
  { work:'fgo',       when:'10-27 21:10', prog:'主线 2.7 章 · 进行中' },
  { work:'monogatari_n', when:'10-26 23:30', prog:'第 6 卷 · 第 3 章' },
  { work:'frieren',   when:'10-25 20:00', prog:'全 28 集 · 已看完' },
];

/* 站内百科的数据源（演示跳转用） */
function enc(s){ return encodeURIComponent(s); }
function wikiFor(name){
  return {
    moegirl:'https://zh.moegirl.org.cn/'+enc(name),
    baidu:'https://baike.baidu.com/item/'+enc(name),
    bangumi:'https://bgm.tv/subject_search/'+enc(name),
  };
}

/* 卷结构（漫画/小说）：每卷有卷名 + 章节，详情页以「可展开栏」呈现 */
const VOL_SUFFIX = ['序','初遇','歧路','试炼','暗流','决意','回响','终'];
function makeVolsRich(count, unit){
  return Array.from({length:count}, (_,i)=>{
    const v=i+1;
    // 卷数特别多的作品（百卷级）每卷只给 4 话，避免详情页堆上千个按钮
    const chCount = count>60 ? 4 : (6 + ((v*3)%5));
    return {
      n:v,
      name:`第 ${v} 卷 · ${VOL_SUFFIX[i%VOL_SUFFIX.length]}`,
      chapters: Array.from({length:chCount}, (_,k)=>({ n:k+1, title:`第 ${k+1} ${unit}` })),
    };
  });
}

/* 连载状态：显式标注的连载中作品（不从年份反推，避免"2023 年后即连载"这类假逻辑） */
const ONGOING_IDS = new Set([
  'frieren','chainsaw','mushoku','rezero','slime_a','spy_a','index_a',   // 动漫
  'fgo','p5',                                                            // 游戏（持续运营）
  'frieren_m','chainsaw_m','onepiece','conan','spy_m',                    // 漫画
  'monogatari_n','rezero_n','index_n','slime_n','overlord_n',             // 轻小说
]);
WORKS.forEach(w=>{ if(!w.status) w.status = ONGOING_IDS.has(w.id) ? '连载' : '完结'; });
/* 形态：剧场版作品（TV 动画以外的单独形态，分类页据此筛选） */
const MOVIE_IDS = new Set(['fate_sn']);
WORKS.forEach(w=>{ if(MOVIE_IDS.has(w.id)) w.form='剧场版'; });

/* 自动补全：漫画/小说的卷结构、游戏信息、百科数据源 */
const GAME_PLATFORMS = ['PC · Steam','PS5 / PS4','Nintendo Switch','PC / 主机'];
WORKS.forEach((w)=>{
  if(w.kind==='manga' && w.volumes){ w.volumes = makeVolsRich(w.volumes.length, '话'); }
  if(w.kind==='novel' && w.volumes){ w.volumes = makeVolsRich(w.volumes.length, '章'); }
  if(w.kind==='game' && !w.gameInfo){
    const len = w.name.length;
    /* 游戏不记录进度（难以衡量），因此不存游玩时长 / 最近游玩 / 存档；
       这里只放与"进度"无关的静态信息（平台、发售、成就、DLC、语言）。 */
    w.gameInfo = {
      platform: GAME_PLATFORMS[len % GAME_PLATFORMS.length],
      release: w.year + ' 年',
      achievements: ((len*3)%40 + 8) + ' / 50',
      dlc: (len%2) ? ['追加剧情 DLC','外观包'] : ['免费更新','季票'],
      /* 游戏也用「状态」管理收藏，但**不是百分比进度**：
         通关度无法从存档读出来，硬算一个 62% 只会是编的。
         这里用四档离散状态，作品区的筛选项也按这四档来。 */
      status: ['在玩','已通关','想玩','搁置'][len%4],
      lang: ['简中 / 繁中 / 英语','简中 / 日语','简中 / 英语','简中 / 繁中'][len%4],
    };
  }
  if(!w.wiki) w.wiki = wikiFor(w.name);
});

/* ---------- 派生数据：评分 / 热度（日·周·总） / 更新时间 / 放送档期 ----------
   排行榜、时间表、分类页排序都依赖这一层，集中生成，避免各页面各算一套。 */
function seedOf(s){ let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))%99991; return h; }
const AIR_TIMES=['00:30','10:00','12:30','18:00','19:30','21:30','22:30','23:30'];
let _animeIdx=0;
WORKS.forEach((w,i)=>{
  const s=seedOf(w.name)+i*17;
  if(w.score==null) w.score=Math.round((7.8+(s%22)/10)*10)/10;   // 7.8 ~ 9.9
  w.pop = { day: 800+(s%4600), week: 6000+(s%34000), total: 60000+(s%940000) };
  /* 媒体分必须带「来源 + 票数」，否则 9.3 是谁打的都说不清（见 §10） */
  w.votes = 240 + (s*7)%24000;
  w.scoreSrc = 'Bangumi';
  w.trend = (s%7)-3;                                             // 名次涨跌
  w.updatedHoursAgo = 1+(s%70);
  // quarter 统一成「季度」：1 / 4 / 7 / 10（数据里写的是月份，这里折算）
  if(w.quarter) w.quarter = w.quarter<=3 ? 1 : w.quarter<=6 ? 4 : w.quarter<=9 ? 7 : 10;
  else w.quarter = 1+(s%4);
  // 放送档期：动漫按顺序均匀铺到周一~周日，保证每天都有排片
  if(w.kind==='anime') w.air = { day: (_animeIdx++)%7, time: AIR_TIMES[s%AIR_TIMES.length] };
});

/* 更新/总集数单位：动漫=集，漫画=话，小说=章，游戏=— */
function unitOf(kind){ return kind==='anime'?'集':kind==='manga'?'话':kind==='novel'?'章':kind==='music'?'首':''; }
/* 总量单位：动漫=集，漫画/小说=卷（卷数才是"总量"，话/章是卷内单位） */
/* 季度只有 1/4/7/10 四个值（数据层已把月份折算成季度），显示时别再写成「X 月」 */
function quarterTxt(q){ return {1:'Q1 · 1—3 月',4:'Q2 · 4—6 月',7:'Q3 · 7—9 月',10:'Q4 · 10—12 月'}[q] || 'Q1'; }
function totalUnitOf(kind){ return kind==='anime'?'集':(kind==='manga'||kind==='novel')?'卷':kind==='music'?'首':''; }
function countOf(w){
  if(w.kind==='anime') return w.episodes?w.episodes.length:0;
  if(w.kind==='music') return w.tracks?w.tracks.length:0;
  if(w.kind==='game') return 0;
  if(w.volumes) return w.volumes.length;
  return 0;
}
/* ---------- 音乐：时长由曲目表算出来，不手写 ---------- */
function trackSecs(d){
  const m=/^(\d+):(\d+)$/.exec(d||'');
  return m ? parseInt(m[1],10)*60+parseInt(m[2],10) : 0;
}
function albumSeconds(w){ return (w.tracks||[]).reduce((a,t)=>a+trackSecs(t.dur), 0); }
/* 「54 分钟」/「1 小时 12 分」——超过一小时别写成 72 分钟 */
function albumDur(w){
  const s=albumSeconds(w), h=Math.floor(s/3600), m=Math.round((s%3600)/60);
  return h ? `${h} 小时 ${m} 分` : `${m} 分钟`;
}
/* 来源文案：原作 / 原创 / 改编自 X（绝不把原作写成"改编自"） */
function originText(w){
  const o=(w&&w.og)||'';
  if(o==='原作') return '原作';
  if(o==='原创') return '原创';
  if(/改$/.test(o)) return '改编自 '+o.replace(/改$/,'');
  return o;
}

/* ---------- 作品区进度：结构化成「总量 + 读到哪 + 百分比」 ----------
   read={ at: 第几集/第几卷, ch: 第几话/章（仅小说用）, done: 是否已看完 }
   游戏不记录进度（难以衡量）。 */
function deriveProgress(w){
  if(!w.shelfStatus || w.kind==='game' || w.kind==='music'){ w.progress=null; return null; }
  const total=countOf(w)||1;
  const r=w.read||{};
  const at=Math.min(Math.max(1, r.at||1), total);
  let ch=null, chOfVol=0;
  if(w.kind==='novel'){
    const v=w.volumes && w.volumes[at-1];
    chOfVol = v ? v.chapters.length : 8;
    ch=Math.min(Math.max(1, r.ch||1), chOfVol);
  }
  const done=!!r.done;
  let pct;
  if(done) pct=100;
  else if(w.kind==='novel') pct=Math.round(((at-1) + ch/chOfVol)/total*100);
  else pct=Math.round(at/total*100);
  w.progress={ total, at, ch, chOfVol, pct:Math.min(100,Math.max(1,pct)), done };
  return w.progress;
}
WORKS.forEach(deriveProgress);
/* 是否有新集/新章（用于作品区的小提醒，近 24 小时内更新且未看完） */
function hasNewBit(w){
  return !!w.progress && !w.progress.done && w.updatedHoursAgo<=24;
}

/* ============================================================
   第二轮审查补充数据（R10 / R14 / R16 / R21 / R45 / R52 / R53 / R55–R57 / R65–R68）
   —— 一律追加在文件末尾，不回头改上面的作品定义
   ============================================================ */

/* ---- R14：主要角色补到 4–6 位（只补公开资料里能确认的主要角色） ---- */
const CAST_EXTRA = {
  aot:[['阿尔敏·阿诺德','井上麻里奈'],['利威尔·阿克曼','神谷浩史'],['埃尔文·史密斯','小野大辅'],['韩吉·佐耶','朴璐美']],
  frieren:[['海塔','东地宏树'],['艾泽','上田耀司'],['修塔尔克','小林千晃'],['阿乌拉','竹达彩奈']],
  chainsaw:[['帕瓦','法元明菜'],['早川秋','坂田将吾'],['姬野','伊濑茉莉也'],['岸边','津田健次郎']],
  sg:[['椎名真由理','花泽香菜'],['桥田至','关智一'],['阿万音铃羽','田村由香里'],['菲利斯·喵喵','桃井晴子']],
  mushoku:[['艾莉丝','加隈亚衣'],['洛琪希','小原好美'],['保罗','森川智之'],['泽尼斯','小林优']],
  rezero:[['爱蜜莉雅','高桥李依'],['雷姆','水濑祈'],['拉姆','村川梨衣'],['贝阿特莉丝','新井里美']],
  kaguya:[['四宫辉夜','古贺葵'],['白银御行','古川慎'],['藤原千花','小原好美'],['石上优','铃木崚汰']],
  monogatari:[['忍野忍','坂本真绫'],['八九寺真宵','加藤英美里'],['神原骏河','泽城美雪'],['千石抚子','花泽香菜']],
  haruhi_a:[['凉宫春日','平野绫'],['阿虚','杉田智和'],['长门有希','茅原实里'],['朝比奈实玖瑠','后藤邑子']],
  sao_a:[['亚丝娜','户松遥'],['莉法','竹达彩奈'],['诗乃','泽城美雪'],['优吉欧','岛崎信长']],
  slime_a:[['利姆鲁','冈咲美保'],['大贤者','丰口惠'],['静江','花守由美里'],['维鲁多拉','前野智昭']],
  kimetsu_a:[['灶门炭治郎','花江夏树'],['灶门祢豆子','鬼头明里'],['我妻善逸','下野纮'],['嘴平伊之助','松冈祯丞']],
  jujutsu_a:[['虎杖悠仁','榎木淳弥'],['伏黑惠','内田雄马'],['钉崎野蔷薇','濑户麻沙美'],['五条悟','中村悠一']],
  spy_a:[['阿尼亚·福杰','种崎敦美'],['约尔·福杰','早见沙织'],['尤里·布莱尔','小野贤章'],['亨利·亨德森','山路和弘']],
  index_a:[['上条当麻','阿部敦'],['茵蒂克丝','井口裕香'],['御坂美琴','佐藤利奈'],['一方通行','冈本信彦']],
  jojo_a:[['乔纳森·乔斯达','兴津和幸'],['迪奥·布兰度','子安武人'],['乔瑟夫·乔斯达','杉田智和'],['空条承太郎','小野大辅']],
  eva_a:[['碇真嗣','绪方惠美'],['绫波丽','林原惠美'],['明日香','宫村优子'],['葛城美里','三石琴乃']],
  fate_sn:[['卫宫士郎','杉山纪彰'],['Saber','川澄绫子'],['远坂凛','植田佳奈'],['间桐樱','下屋则子']],
  p5:[['Joker','福山润'],['坂本龙司','宫野真守'],['高卷杏','水树奈奈'],['摩尔加纳','大谷育江']],
  fgo:[['藤丸立香','岛崎信长'],['玛修·基列莱特','高桥李依'],['达·芬奇','坂本真绫']],
  dangan:[['苗木诚','绪方惠美'],['雾切响子','日笠阳子'],['十神白夜','石田彰'],['黑白熊','大山羡代']],
  higurashi:[['前原圭一','保志总一朗'],['龙宫礼奈','中原麻衣'],['园崎魅音','雪野五月'],['古手梨花','田村由香里']],
};
WORKS.forEach(w=>{
  const add=CAST_EXTRA[w.id]; if(!add) return;
  const have=new Set((w.cast||[]).map(c=>c.role));
  add.forEach(([role,actor])=>{ if(!have.has(role)) w.cast.push({role,actor}); });
});

/* ---- R16：别名 / 原名（没有可靠译名的不硬凑，缺就不显示） ---- */
const META_EXTRA = {
  aot:{ jp:'進撃の巨人', aka:'巨人 / AoT', station:'MBS' },
  frieren:{ jp:'葬送のフリーレン', aka:'Frieren', station:'日本テレビ' },
  chainsaw:{ jp:'チェンソーマン', aka:'电锯人 / CSM', station:'东京电视台' },
  sg:{ jp:'シュタインズ・ゲート', aka:'Steins;Gate / 石头门', station:'AT-X' },
  mushoku:{ jp:'無職転生', aka:'无职转生 ～到了异世界就拿出真本事～', station:'TOKYO MX' },
  rezero:{ jp:'Re:ゼロから始める異世界生活', aka:'Re:从零开始的异世界生活', station:'东京电视台' },
  kaguya:{ jp:'かぐや様は告らせたい', aka:'辉夜大小姐想让我告白', station:'TOKYO MX' },
  monogatari:{ jp:'〈物語〉シリーズ', aka:'化物语 / 伪物语', station:'TOKYO MX' },
  haruhi_a:{ jp:'涼宮ハルヒの憂鬱', aka:'凉宫春日的忧郁', station:'千叶电视台' },
  sao_a:{ jp:'ソードアート・オンライン', aka:'SAO', station:'TOKYO MX' },
  slime_a:{ jp:'転生したらスライムだった件', aka:'转生史莱姆', station:'TOKYO MX' },
  kimetsu_a:{ jp:'鬼滅の刃', aka:'鬼灭', station:'TOKYO MX' },
  jujutsu_a:{ jp:'呪術廻戦', aka:'咒术回战', station:'MBS' },
  spy_a:{ jp:'SPY×FAMILY', aka:'间谍家家酒', station:'东京电视台' },
  index_a:{ jp:'とある魔術の禁書目録', aka:'禁书目录 / 魔禁', station:'AT-X' },
  jojo_a:{ jp:'ジョジョの奇妙な冒険', aka:'JOJO', station:'TOKYO MX' },
  eva_a:{ jp:'新世紀エヴァンゲリオン', aka:'EVA / 天鹰战士', station:'东京电视台' },
  fate_sn:{ jp:'Fate/stay night', aka:'FSN', station:'TOKYO MX' },
};
WORKS.forEach(w=>{ const m=META_EXTRA[w.id]; if(m) w.meta=m; });

/* ---- 放送局：深夜动画常见台（演示数据，按作品稳定分配） ---- */
const STATIONS=['TOKYO MX','MBS','BS11','AT-X','tvk','Tokyo MX'];
WORKS.forEach((w,i)=>{ if(w.kind==='anime' && !(w.meta&&w.meta.station)) w.station=STATIONS[i%STATIONS.length]; });

/* ---- R10：分集标题（演示数据的标题池，按作品稳定分配、同一部内不重复） ---- */
const EP_TITLE_POOL=['初次相遇','裂痕','旧约','回声','夜行','远方来信','名为家的地方','倒影','无声的雪',
  '第七个夜晚','间隙','逆光','边界','同路人','未寄出的信','雨停之后','空白的一页','火种','两难的答案',
  '门后','归途','沉默的证词','断章','最后一课','碎片','冷却','旧伤','锚点','分岔路','无人知晓',
  '十字路口','低语','背向而行','迟到的告白','昨日之城','暗涌','让步','第三选择','残缺的圆','纸飞机',
  '雪原','交换','终局之前','名字','未完成','重逢','代价','南风','指路的人','第二封信'];
function epTitlesFor(w){
  const n=(w.episodes||[]).length; if(!n) return [];
  let seed=0; for(let i=0;i<w.id.length;i++) seed=(seed*31+w.id.charCodeAt(i))%99991;
  const pool=EP_TITLE_POOL.slice();
  const out=[];
  for(let i=0;i<n;i++){
    const idx=(seed+i*7+Math.floor(seed/97)*3)%pool.length;
    out.push(pool.splice(idx,1)[0] || ('第 '+(i+1)+' 集'));
    if(!pool.length) pool.push(...EP_TITLE_POOL);
  }
  return out;
}
WORKS.forEach(w=>{ if(w.kind==='anime') w.epTitles=epTitlesFor(w); });

/* ---- R21：系列简介与观看顺序（系列页存在的理由） ---- */
const SERIES_META = {
  sg:{ intro:'以「世界线」为核心的时间旅行群像剧。秋叶原的一台电话微波炉能把短信送去过去，每一次改动都会换一条世界线。',
       order:'先看《命运石之门》TV（2011），再看《命运石之门 0》；小说与外传放最后。' },
  frieren:{ intro:'魔王讨伐之后的故事：精灵魔法使带着「理解人类」的课题，重走一遍当年与伙伴走过的路。',
       order:'动画 2023 版覆盖漫画前 7 卷，两边可以并行；想追进度读漫画。' },
  aot:{ intro:'墙内人类与巨人的战争，随真相层层反转，最终走到「岛与世界的对立」。',
       order:'按播出顺序：S1(2013) → S2(2017) → S3(2018/19) → The Final Season；漫画可对照最终季。' },
  chainsaw:{ intro:'恶魔与猎人的黑色幽默动作剧，把「打工」和「生存」写成了同一件事。',
       order:'动画第一季 → 漫画（从第 39 话接续）。' },
  monogatari:{ intro:'以对话驱动的怪异事件集，时间线本身是打乱的，按发表顺序看最不容易迷路。',
       order:'《化物语》→《伪物语》→《猫物语（黑）》→ 之后按动画播出顺序。' },
  mushoku:{ intro:'转生系奇幻的长线成长记，从出生写到中年，重点在「这一世要认真活」。',
       order:'动画第一季 → 第二季；小说从第 7 卷起接续，结局在小说。' },
  rezero:{ intro:'「死亡回归」循环叙事：主角每次死去都会回到同一个存档点，只能靠记忆一点点改写结局。',
       order:'动画第一季 → 第二季；小说为原作，可随时补。' },
  kaguya:{ intro:'学生会里的恋爱头脑战：先告白的人就输了，于是两个人互相设计让对方先说。',
       order:'动画与漫画同步推进，按播出顺序即可。' },
  fate:{ intro:'围绕「圣杯战争」的多路线、多媒介企划，每条线的主角与结论都不同。',
       order:'新手路线：Fate/Zero（前传）→ Fate/stay night [UBW]；FGO 是手游独立线，不影响主线。' },
  kimetsu:{ intro:'大正时代的鬼杀队与十二鬼月，画面与战斗演出是这一代少年漫的代表。',
       order:'动画按季度顺序；漫画已完结，可以一次读完再回看动画。' },
  jujutsu:{ intro:'咒术师与咒灵的对抗，战斗规则复杂但自洽，人物关系是主要看点。',
       order:'动画第一季 → 剧场版 0 → 第二季；漫画从第 65 话接动画。' },
  spy:{ intro:'间谍、杀手与超能力少女组成的临时家庭，用「过家家」完成三方任务。',
       order:'动画与漫画都按发布顺序，单元剧为主，随时可以切入。' },
  sao:{ intro:'VRMMO 里的生死游戏，之后每一季换一个虚拟世界。',
       order:'动画第一季（艾恩葛朗特）→ 第二季 → Alicization；小说细节更完整。' },
  index:{ intro:'学园都市的超能力与魔法双线并行，外传《超电磁炮》从另一侧补完同一座城市。',
       order:'《魔法禁书目录》→ 外传《某科学的超电磁炮》，两条线可以独立看。' },
  jojo:{ intro:'跨越百年的乔斯达家族史，每一部换主角、换舞台，替身设定从第三部开始。',
       order:'按部数顺序看；第 7 部起是平行世界，也可以单独入门。' },
  gundam:{ intro:'宇宙世纪高达的起点，一年战争改变了整个机甲题材的叙事方式。',
       order:'1979 初代 → Z → ZZ → 逆袭的夏亚，按宇宙世纪年表。' },
  haruhi:{ intro:'SOS 团的日常与非日常，2006 版的打乱播出本身就是作品设计的一部分。',
       order:'建议看 2009 版（时间顺序），再看剧场版《消失》。' },
  slime:{ intro:'转生为史莱姆的建国谭，从一只史莱姆长成一个国家的外交与战争。',
       order:'动画第一季 → 第二季；小说进度最靠前。' },
  onepiece:{ intro:'大海贼时代的长篇冒险，篇章结构清晰，每一座岛都是一个完整故事。',
       order:'按篇章顺序；动画可从「和之国」等新篇章切入试看。' },
  conan:{ intro:'单元剧为主的推理长寿作，主线集中在黑衣组织相关的少数集数。',
       order:'单元剧可跳看，主线按「黑衣组织」相关集数补。' },
  naruto:{ intro:'忍者成长与忍界战争，前后两部的主角视角不同。',
       order:'《火影忍者》→《疾风传》；《博人传》是下一代续作。' },
  dragonball:{ intro:'少年漫画的格斗原点，从寻找龙珠的冒险转为宇宙级战斗。',
       order:'《龙珠》→《Z》→《超》，剧场版可穿插。' },
  spice:{ intro:'行商与狼神的旅途，经济与对白是主要乐趣。',
       order:'小说按卷序；动画覆盖第 1—5 卷。' },
  overlord:{ intro:'反派视角的异世界征服，主角一方始终是「最强」。',
       order:'动画第一季 → 第二季 → 第三季；小说细节更多。' },
  p5:{ intro:'校园怪盗题材 RPG，白天上学、夜里潜入「宫殿」改心。',
       order:'P5 原版 → P5R（皇家版，追加剧情）；P5S 是动作续作。' },
  eva:{ intro:'世纪末的机甲与心理描写，TV 版与新旧剧场版是三条不同的结尾。',
       order:'TV 1—24 话 → 剧场版《Air/真心为你》；新剧场版系列是重启线。' },
  higurashi:{ intro:'循环惨剧的推理剧，同一段时间从不同人的视角反复重演。',
       order:'按「出题篇 → 解答篇」看，不要跳篇。' },
  dangan:{ intro:'高速推理冒险，处刑与学级裁判是系列标志。',
       order:'第 1 部 → 第 2 部 → V3。' },
};

/* ---- R52：连载单位与单行本单位要分开 ---- */
function serialUnitOf(kind){ return kind==='anime' ? '集' : kind==='manga' ? '话' : kind==='novel' ? '章' : kind==='music' ? '首' : '项'; }
function volumeUnitOf(kind){ return (kind==='manga'||kind==='novel') ? '卷' : ''; }

/* ---- R42 / R43：浏览历史分桶（0=今天 / 1=昨天 / 2=更早），可在前端删除 ---- */
const HISTORY_SEED = [
  { id:'h1', work:'sg',        when:'14:20', bucket:0, prog:'第 5 集 · 21%' },
  { id:'h2', work:'mushoku',   when:'22:05', bucket:1, prog:'第 13 集 · 57%' },
  { id:'h3', work:'aot_m',     when:'19:40', bucket:1, prog:'第 34 卷 · 已读完' },
  { id:'h4', work:'fgo',       when:'21:10', bucket:2, prog:'主线 2.7 章 · 进行中' },
  { id:'h5', work:'monogatari_n', when:'23:30', bucket:2, prog:'第 6 卷 · 第 3 章' },
  { id:'h6', work:'frieren',   when:'20:00', bucket:2, prog:'全 28 集 · 已看完' },
  { id:'h7', work:'kaguya',    when:'11:05', bucket:0, prog:'第 3 集 · 12%' },
];
const HIST_LABEL = ['今天','昨天','更早'];

/* ---- 下载任务补体积（R35）与真实封面（R32） ---- */
const DL_SIZES = { sg:1.8, mushoku:1.4, rezero:1.5, monogatari:2.1, onepiece:0.9 };
Object.assign(DOWNLOADS.reduce((a,d)=>(a[d.work]=a[d.work]||d,a),{}),{});
DOWNLOADS.forEach(d=>{ d.size = DL_SIZES[d.work] || 1.2; d.totalGB = 10.4; });

/* ---- R55–R57：评测 / 攻略的成稿信息（作者、摘要、角度化标题） ---- */
const ART_AUTHORS = ['林间雾','黑咖啡','十六','柚子','南屿','青叶','观星台','白鲸','旧书页','灯塔'];
const REVIEW_ANGLES = {
  aot:'当「自由」变成一种诅咒：最终季的叙事取舍',
  frieren:'把「告别」拍成日常：芙莉莲的时间感',
  chainsaw:'为什么电次的笑比哭更难受',
  sg:'世界线收束不是设定，是道德困境',
  rezero:'死亡回归如何避免变成廉价的重来',
  mushoku:'转生题材里少见的「中年视角」',
  kaguya:'恋爱头脑战的喜剧结构拆解',
  spy:'把冷战间谍片拍成家庭喜剧的分寸感',
  eva:'26 话之后：TV 版结尾到底在讲什么',
  jujutsu_a:'战斗规则的密度，与它的代价',
  kimetsu_a:'作画之外的叙事短板',
  fate_sn:'三条路线的分歧点在哪里',
  sao_a:'艾恩葛朗特篇为什么仍然最好看',
  p5:'宫殿设计与现实议题的对位',
  fgo:'主线 2.7 章的叙事野心',
  dangan:'学级裁判的节奏控制',
  higurashi:'循环结构下的信息分配',
  jojo_a:'替身设定如何解决「越打越强」的难题',
  gundam_a:'一年战争作为反战叙事的起点',
  onepiece:'和之国篇之后，路飞的目标变了吗',
};
const GUIDE_ANGLES = {
  aot:'从第一集到最终季的完整观看顺序',
  frieren:'动画与漫画的对照阅读路线',
  sg:'世界线整理：先看哪一条',
  monogatari:'时间线梳理：按这个顺序看不会乱',
  rezero:'轮次与存档点整理',
  fate_sn:'Fate 系列入门：五条路线怎么选',
  index:'魔法侧与科学侧的对读顺序',
  jojo:'八部曲的部数与时间线对照',
  gundam_a:'宇宙世纪年表与作品对应',
  eva:'TV 版 / 旧剧场版 / 新剧场版的关系',
  p5:'全宫殿攻略顺序与最短路线',
  fgo:'主线 2.7 章通关流程',
  dangan:'全章节流程与证物清单',
  higurashi:'出题篇到解答篇的推理链',
  slime_a:'建国篇的资源与战力整理',
  spy_a:'单元剧的阅读切入建议',
};

/* ---- R37：磁盘（演示） ---- */
const DISKS = [
  { id:'d1', name:'系统盘 (C:)',  total:512, usedOther:326, free:null, kind:'ssd',  res:{ anime:38.2, game:64.5, manga:6.4, novel:2.1, music:11.3 } },
  { id:'d2', name:'资源盘 (D:)',  total:2048, usedOther:214, free:null, kind:'hdd', res:{ anime:412.6, game:530.8, manga:96.2, novel:24.7, music:188.4 } },
  { id:'d3', name:'移动硬盘 (E:)', total:1024, usedOther:0,   free:null, kind:'usb', res:{ anime:226.1, game:0, manga:64.8, novel:12.2, music:82.5 } },
  { id:'d4', name:'NAS (\\\\NAS\\acgn)', total:4096, usedOther:88, free:null, kind:'nas', res:{ anime:820.4, game:0, manga:210.5, novel:64.9, music:410.2 } },
];

/* ---- R30：统计（演示口径） ---- */
const STATS_DEMO = {
  watchHours: 412.5, finished: 37, thisWeek: 6.2, streak: 12,
  byKind: { anime:186.4, game:96.0, manga:62.1, novel:38.5, music:29.5 },
  /* R41：只有四格数字 + 五根横条时下半屏全空，补「本周每天看了多久」与「最近在看」 */
  week: [ {d:'一',h:1.4}, {d:'二',h:0.4}, {d:'三',h:0}, {d:'四',h:1.8}, {d:'五',h:0.6}, {d:'六',h:1.3}, {d:'日',h:0.7} ],
  weekAvg: 0.9,
  recent: [
    { work:'aot',     sub:'第 12 集 · 昨天 23:40' },
    { work:'frieren', sub:'第 5 集 · 昨天 21:12' },
    { work:'chainsaw',sub:'第 9 集 · 10 月 27 日' },
    { work:'p5',      sub:'11.6 小时 · 10 月 26 日' },
  ],
};

/* ---- R38：资源库里没有被规则命中的文件夹（识别 ≠ 全自动，得给个出口） ---- */
const UNMATCHED_DIRS = [
  { name:'SPY×FAMILY 第2季', meta:'4 个视频文件 · 12.4 GB · 未匹配到作品' },
  { name:'[未知字幕组] 夏日重现 01-25', meta:'25 个视频文件 · 26.8 GB · 命名不含集数' },
  { name:'Grisaia 合集', meta:'8 个文件夹 · 30.1 GB · 疑似视觉小说' },
];

/* ---- R04：随机推荐去重不要撞上最近 5 次 ---- */
const PICK_MEMORY = 5;

/* ---- R40：设置页补「存储」「高级」两组（原来整页只有两组、使用率不到 40%） ---- */
PANEL_ROWS.storage=[
  { k:'cache',  label:'刮削缓存', desc:'约 246 MB · 可随时清理，清理后重新刮削即可', type:'action', act:'清理' },
  { k:'export', label:'导出数据', desc:'收藏 / 进度 / 设置 → JSON', type:'action', act:'导出' },
  { k:'import', label:'导入数据', desc:'从 JSON 恢复，会覆盖当前数据', type:'action', act:'选择文件' },
  { k:'dir',    label:'资源目录', desc:'D:/ACGN · 已识别', type:'action', act:'更改' },
];
PANEL_ROWS.advanced=[
  { k:'exp',      label:'实验特性', desc:'可能不稳定，随时会改', type:'toggle', def:false },
  { k:'log',      label:'日志级别', desc:'排查问题时用', type:'value', opts:['关闭','仅错误','详细'], def:1 },
  { k:'shortcut', label:'快捷键说明', desc:'空格 / ← → / ↑ ↓ / N / Esc', type:'action', act:'查看' },
  { k:'reset',    label:'重置所有设置', desc:'不会删除作品与观看进度', type:'action', act:'重置' },
];
/* R60：弹幕默认关闭，设置项也照这个口径 */
PANEL_ROWS.danmaku=[
  { k:'on',      label:'默认开启弹幕', desc:'关闭时播放器不显示弹幕与输入框', type:'toggle', def:false },
  { k:'opacity', label:'弹幕透明度', type:'value', opts:['40%','70%','100%'], def:1 },
  { k:'size',    label:'弹幕字号', type:'value', opts:['小','中','大'], def:1 },
  { k:'speed',   label:'弹幕速度', type:'value', opts:['慢','中','快'], def:1 },
  { k:'shield',  label:'关键词屏蔽', desc:'已添加 6 个关键词', type:'action', act:'管理' },
];
PANEL_ROWS.general=[
  { k:'lang',    label:'界面语言', type:'value', opts:['简体中文','繁體中文','English'], def:0 },
  { k:'startup', label:'启动页', type:'value', opts:['首页','作品区','上次离开的页面'], def:0 },
  { k:'default', label:'默认分区', type:'value', opts:['动漫','游戏','漫画','轻小说','音乐'], def:0 },
];

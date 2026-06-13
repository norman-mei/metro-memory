const fs = require('fs')
const path = require('path')
const { pinyin } = require('pinyin-pro')
const OpenCC = require('opencc-js')

const toTraditionalChinese = OpenCC.Converter({ from: 'cn', to: 'tw' })

const root = __dirname
const stationGeoPath = path.join(root, 'beijing.geojson')
const routeGeoPath = path.join(root, 'new.geojson')
const outFeatures = path.join(root, 'features.json')
const outRoutes = path.join(root, 'routes.json')
const outLines = path.join(root, 'lines.json')

const lineSpecs = [
  { id: 'beijing1', name: 'Line 1', color: '#A4343A', icon: '1.png', order: 1, keywords: ['北京地铁1号线'] },
  { id: 'beijingbatong', name: 'Batong', color: '#A4343A', icon: 'batong.png', order: 2, keywords: ['八通线'] },
  { id: 'beijing2', name: 'Line 2', color: '#004B87', icon: '2.png', order: 3, keywords: ['北京地铁2号线'] },
  { id: 'beijing3', name: 'Line 3', color: '#D90627', icon: '3.png', order: 4, keywords: ['北京地铁3号线'] },
  { id: 'beijing4', name: 'Line 4', color: '#008294', icon: '4.png', order: 5, keywords: ['地铁4号线', '北京地铁4号线'] },
  { id: 'beijingdaxing', name: 'Daxing', color: '#008294', icon: 'daxing.png', order: 6, keywords: ['地铁大兴线'] },
  { id: 'beijing5', name: 'Line 5', color: '#AA0061', icon: '5.png', order: 7, keywords: ['北京地铁5号线'] },
  { id: 'beijing6', name: 'Line 6', color: '#B58500', icon: '6.png', order: 8, keywords: ['北京地铁6号线'] },
  { id: 'beijing7', name: 'Line 7', color: '#FFC56E', icon: '7.png', order: 9, keywords: ['北京地铁7号线'] },
  { id: 'beijing8', name: 'Line 8', color: '#049477', icon: '8.png', order: 10, keywords: ['北京地铁8号线'] },
  { id: 'beijing9', name: 'Line 9', color: '#88D400', icon: '9.png', order: 11, keywords: ['北京地铁9号线'] },
  { id: 'beijing10', name: 'Line 10', color: '#108BBC', icon: '10.png', order: 12, keywords: ['北京地铁10号线'] },
  { id: 'beijing11', name: 'Line 11', color: '#FF8775', icon: '11.png', order: 13, keywords: ['北京地铁11号线'] },
  { id: 'beijing12', name: 'Line 12', color: '#9E5102', icon: '12.png', order: 14, keywords: ['北京地铁12号线'] },
  { id: 'beijing13', name: 'Line 13', color: '#F5D40A', icon: '13.png', order: 15, keywords: ['北京地铁13号线', '地铁13号线', '13号线'] },
  { id: 'beijing14', name: 'Line 14', color: '#D5A9A2', icon: '14.png', order: 16, keywords: ['北京地铁14号线', 'Subway Line 14'] },
  { id: 'beijing15', name: 'Line 15', color: '#652E7A', icon: '15.png', order: 17, keywords: ['北京地铁15号线'] },
  { id: 'beijing16', name: 'Line 16', color: '#6DA943', icon: '16.png', order: 18, keywords: ['北京地铁16号线'] },
  { id: 'beijing17', name: 'Line 17', color: '#00ACAC', icon: '17.png', order: 19, keywords: ['北京地铁17号线'] },
  { id: 'beijing18', name: 'Line 18', color: '#5453A3', icon: '18.png', order: 20, keywords: ['北京地铁18号线'] },
  { id: 'beijing19', name: 'Line 19', color: '#D4A5CA', icon: '19.png', order: 21, keywords: ['北京地铁19号线', 'Beijing Subway Line19'] },
  { id: 'beijingyizhuang', name: 'Yizhuang', color: '#E1147D', icon: 'yizhuang.png', order: 22, keywords: ['北京地铁亦庄线'] },
  { id: 'beijingfangshan', name: 'Fangshan', color: '#D95F21', icon: 'fangshan.png', order: 23, keywords: ['北京地铁房山线', '房山线'] },
  { id: 'beijingyanfang', name: 'Yanfang', color: '#DB6113', icon: 'yanfang.png', order: 24, keywords: ['北京地铁燕房线'] },
  { id: 'beijings1', name: 'Line S1', color: '#A55B27', icon: 's1.png', order: 25, keywords: ['北京地铁S1线'] },
  { id: 'beijingchangping', name: 'Changping', color: '#D57EAB', icon: 'changping.png', order: 26, keywords: ['北京地铁昌平线'] },
  { id: 'beijingcae', name: 'Capital Airport Express', color: '#A394B4', icon: 'cae.png', order: 27, keywords: ['首都机场线'] },
  { id: 'beijingdae', name: 'Daxing Airport Express', color: '#0349A7', icon: 'dae.png', order: 28, keywords: ['大兴机场线'] },
  { id: 'beijingxijiao', name: 'Xijiao', color: '#D4232E', icon: 'xijiao.png', order: 29, keywords: ['西郊线'] },
  { id: 'beijingyizhuangt1', name: 'Yizhuang T1', color: '#D4232E', icon: 'yizhuangt1.png', order: 30, keywords: ['亦庄新城现代有轨电车T1线'] },
  { id: 'beijingsubcenter', name: 'Sub-Central', color: '#11385B', icon: 'subcenter.png', order: 31, keywords: ['京广线', '京沪线', '京哈线', '京通线'] },
  { id: 'beijings2', name: 'Line S2', color: '#11385B', icon: 's2.png', order: 32, keywords: ['京包线', '康延线'] },
  { id: 'beijinghuairou', name: 'Huairou-Miyun', color: '#F65275', icon: 'huairou.png', order: 33, keywords: ['京包客专线', '京承线'] },
  { id: 'beijingtongmi', name: 'Tongmi', color: '#11385B', icon: 'tongmi.png', order: 34, keywords: ['京通线', '京承线'] },
  { id: 'beijingcapitalapm', name: 'Capital Airport APM', color: '#004DA2', icon: 'CapitalAPM.png', order: 35, keywords: ['北京首都国际机场旅客捷运系统'] },
]

const routeKeywordAdditions = {
  beijing4: ['Line 4 Part 2'],
  beijing6: ['Line 6 Part 2'],
  beijing8: ['Line 8 Part 2'],
  beijing10: ['Line 10 Part 2'],
  beijing13: ['Line 13 Part 2'],
  beijing14: ['Line 14 Part 2'],
  beijing15: ['Line 15 Part 2'],
  beijingyizhuang: ['Yizhuang Part 2'],
}

const suburbanRailwayLineIds = new Set([
  'beijingsubcenter',
  'beijings2',
  'beijinghuairou',
  'beijingtongmi',
])

const readPngAspectRatio = (icon) => {
  const imagePath = path.join(process.cwd(), 'public', 'images', 'asia', 'china', 'beijing', icon)
  try {
    const header = fs.readFileSync(imagePath).subarray(0, 24)
    if (
      header.length < 24 ||
      header.readUInt32BE(0) !== 0x89504e47 ||
      header.toString('ascii', 12, 16) !== 'IHDR'
    ) {
      return null
    }
    const width = header.readUInt32BE(16)
    const height = header.readUInt32BE(20)
    if (!width || !height) return null
    return Number((width / height).toFixed(4))
  } catch {
    return null
  }
}

const stationGroups = {
  beijing1: [
    ['Fushouling', '福寿岭'], ['Pingguoyuan', '苹果园'], ['Gucheng', '古城'], ['Bajiao Amusement Park', '八角游乐园'], ['Babaoshan', '八宝山'], ['Yuquan Lu', '玉泉路'], ['Wukesong', '五棵松'], ['Wanshou Lu', '万寿路'], ['Gongzhufen', '公主坟'], ['Military Museum', '军事博物馆'], ['Muxidi', '木樨地'], ['Nanlishi Lu', '南礼士路'], ['Fuxingmen', '复兴门'], ['Xidan', '西单'], ["Tian'anmenxi", '天安门西'], ["Tian'anmendong", '天安门东'], ['Wangfujing', '王府井'], ['Dongdan', '东单'], ['Jianguomen', '建国门'], ["Yong'an Li", '永安里'], ['Guomao', '国贸'], ['Dawang Lu', '大望路'], ['Sihui', '四惠'], ['Sihuidong', '四惠东'],
  ],
  beijingbatong: [
    ['Gaobeidian', '高碑店'], ['Communication University of China', '传媒大学'], ['Shuang Qiao', '双桥'], ['Guaanzhuang', '管庄', ['Guanzhuang']], ['Bali Qiao', '八里桥'], ['Tongzhou Beiyuan', '通州北苑'], ['Guoyuan', '果园'], ['Jiukeshu', '九棵树'], ['Liyuan', '梨园'], ['Linheli', '临河里'], ['Tu Qiao', '土桥'], ['Huazhuang', '花庄'], ['Universal Resort', '环球度假区'],
  ],
  beijing2: [
    ['Xizhimen', '西直门'], ['Chegongzhuang', '车公庄'], ['Fucheng Men', '阜成门'], ['Fuxingmen', '复兴门', [], 'beijing-fuxingmen-taipingqiao-complex'], ['Changchun Jie', '长椿街'], ['Xuanwu Men', '宣武门'], ['Heping Men', '和平门'], ['Qianmen', '前门'], ['Chongwen Men', '崇文门'], ['Beijing Railway Station', '北京站', ['Beijing', 'Beijing Railway', 'BJP']], ['Jianguomen', '建国门'], ['Chaoyang Men', '朝阳门'], ['Dongsi Shitiao', '东四十条'], ['Dongzhimen', '东直门'], ['Yonghegong Lama Temple', '雍和宫'], ['Anding Men', '安定门'], ['Gulou Dajie', '鼓楼大街'], ['Jishuitan', '积水潭'],
  ],
  beijing3: [
    ['Dongsi Shitiao', '东四十条'], ["Workers' Stadium", '工人体育场'], ['Tuanjiehu', '团结湖'], ['Chaoyang Park', '朝阳公园'], ['Shifoying', '石佛营'], ['Chaoyang railway station', '朝阳站'], ['Yaojiayuan', '姚家园'], ['Dongbanan', '东坝南'], ['Dongba', '东坝'], ['Dongbabei', '东坝北'],
  ],
  beijing4: [
    ['Anheqiaobei', '安河桥北'], ['Beigongmen', '北宫门'], ['Xi Yuan', '西苑'], ['Yuanmingyuan Park', '圆明园'], ['Peking University East Gate', '北京大学东门'], ['Zhongguancun', '中关村'], ['Haidian Huangzhuang', '海淀黄庄'], ['Renmin University', '人民大学'], ['Weigongcun', '魏公村'], ['National Library', '国家图书馆'], ['Beijing Zoo', '动物园'], ['Xizhimen', '西直门'], ['Xinjie Kou', '新街口'], ["Ping'anli", '平安里'], ['Xisi', '西四'], ['Lingjing Hutong', '灵境胡同'], ['Xidan', '西单'], ['Xuanwu Men', '宣武门'], ['Caishi Kou', '菜市口'], ['Taoranting', '陶然亭'], ['Beijing South Railway Station', '北京南站'], ['Majiapu', '马家堡'], ['Jiaomenxi', '角门西'], ['Gongyi Xiqiao', '公益西桥'],
  ],
  beijingdaxing: [
    ['Xingong', '新宫'], ['Xihong Men', '西红门'], ['Gaomidianbei', '高米店北'], ['Gaomidiannan', '高米店南'], ['Zaoyuan', '枣园'], ['Qingyuan Lu', '清源路'], ['Huangcun Xidajie', '黄村西大街'], ['Huangcun Railway Station', '黄村火车站'], ['Yihezhuang', '义和庄'], ['Biomedical Base', '生物医药基地'], ['Tiangong Yuan', '天宫院'],
  ],
  beijing5: [
    ['Tiantongyuanbei', '天通苑北'], ['Tiantongyuan', '天通苑'], ['Tiantongyuannan', '天通苑南'], ['Lishui Qiao', '立水桥'], ['Lishuiqiaonan', '立水桥南'], ['Beiyuanlubei', '北苑路北'], ['Datunludong', '大屯路东'], ['Huixin Xijie Beikou', '惠新西街北口'], ['Huixin Xijie Nankou', '惠新西街南口'], ['Heping Xiqiao', '和平西桥'], ['Hepingli Beijie', '和平里北街'], ['Yonghegong Lama Temple', '雍和宫'], ['Beixinqiao', '北新桥'], ['Zhangzizhong Lu', '张自忠路'], ['Dongsi', '东四'], ['Dengshi Kou', '灯市口'], ['Dongdan', '东单'], ['Chongwen Men', '崇文门'], ['Ciqi Kou', '磁器口'], ['Temple of Heaven East Gate', '天坛东门'], ['Puhuangyu', '蒲黄榆'], ['Liujiayao', '刘家窑'], ['Songjiazhuang', '宋家庄'],
  ],
  beijing6: [
    ["Jin'anqiao", '金安桥'], ['Pingguoyuan', '苹果园'], ['Yangzhuang', '杨庄'], ['Xihuangcun', '西黄村'], ['Liaogongzhuang', '廖公庄'], ['Tiancun', '田村'], ['Haidian Wuluju', '海淀五路居'], ['Cishou Si', '慈寿寺'], ['Huayuan Qiao', '花园桥'], ['Baishiqiaonan', '白石桥南'], ['Erligou', '二里沟'], ['Chegongzhuangxi', '车公庄西'], ['Chegongzhuang', '车公庄'], ["Ping'anli", '平安里'], ['Beihaibei', '北海北'], ['Nanluogu Xiang', '南锣鼓巷'], ['Dongsi', '东四'], ['Chaoyang Men', '朝阳门'], ['Dongdaqiao', '东大桥'], ['Hujialou', '呼家楼'], ['Jintai Lu', '金台路'], ['Shilipu', '十里堡'], ['Qingnian Lu', '青年路'], ['Dalianpo', '褡裢坡'], ['Huangqu', '黄渠'], ['Changying', '常营'], ['Caofang', '草房'], ['Wuzi Xueyuan Lu', '物资学院路'], ['Tongzhou Beiguan', '通州北关'], ['Tongyun Men', '通运门'], ['Beiyunhexi', '北运河西'], ['Beiyunhedong', '北运河东'], ['Haojia Fu', '郝家府'], ['Dongxia Yuan', '东夏园'], ['Lucheng', '潞城'], ['Luyang', '潞阳'],
  ],
  beijing7: [
    ['Beijing West Railway Station', '北京西站'], ['Wanzi', '湾子'], ['Daguanying', '达官营'], ["Guang'anmen Nei", '广安门内'], ['Caishi Kou', '菜市口'], ['Hufangqiao', '虎坊桥'], ['Zhushikou', '珠市口'], ['Qiaowan', '桥湾'], ['Ciqi Kou', '磁器口'], ['Guangqumen Nei', '广渠门内'], ['Guangqumen Wai', '广渠门外'], ['Shuangjing', '双井'], ['Jiulongshan', '九龙山'], ['Dajiaoting', '大郊亭'], ['Baiziwan', '百子湾'], ['Huagong', '化工'], ['Nanlouzi Zhuang', '南楼梓庄'], ['Happy Valley', '欢乐谷景区'], ['Fatou', '垡头'], ['Shuanghe', '双合'], ['Jiaohua Chang', '焦化厂'], ['Huangchang', '黄厂'], ['Langxinzhuang', '郎辛庄'], ['Heizhuanghu', '黑庄户'], ['Wanshengxi', '万盛西'], ['Wanshengdong', '万盛东'], ['Qunfang', '群芳'], ['Gaoloujin', '高楼金'], ['Huazhuang', '花庄'], ['Universal Resort', '环球度假区'],
  ],
  beijing8: [
    ['Zhuxinzhuang', '朱辛庄'], ['Yuzhi Lu', '育知路'], ['Pingxi Fu', '平西府'], ['Huilongguan Dongdajie', '回龙观东大街'], ['Huoying', '霍营'], ['Yuxin', '育新'], ['Xixiao Kou', '西小口'], ['Yongtaizhuang', '永泰庄'], ['Lincuiqiao', '林萃桥'], ['Senlin Gongyuan Nanmen', '森林公园南门', ['Forest Park South Gate']], ['Aolinpike Gongyuan', '奥林匹克公园', ['Olympic Park']], ['Aoti Zhongxin', '奥体中心', ['Olympic Sports Center']], ['Beitucheng', '北土城'], ['Anhua Qiao', '安华桥'], ['Andeli Beijie', '安德里北街'], ['Gulou Dajie', '鼓楼大街'], ['Shichahai', '什刹海'], ['Nanluogu Xiang', '南锣鼓巷'], ['National Art Museum', '中国美术馆'], ['Jinyu Hutong', '金鱼胡同'], ['Wangfujing', '王府井'], ['Qianmen', '前门'], ['Zhushikou', '珠市口'], ['Tianqiao', '天桥'], ['Yongdingmenwai', '永定门外'], ['Muxi Yuan', '木樨园'], ['Haihutun', '海户屯'], ['Dahong Men', '大红门'], ['Dahongmennan', '大红门南'], ['Heyi', '和义'], ['Donggaodi', '东高地'], ['Huojian Wanyuan', '火箭万源'], ['Wufutang', '五福堂'], ['Demao', '德茂'], ['Yinghai', '瀛海'],
  ],
  beijing9: [
    ['National Library', '国家图书馆'], ['Baishiqiaonan', '白石桥南'], ['Baiduizi', '白堆子'], ['Military Museum', '军事博物馆'], ['Beijing West Railway Station', '北京西站'], ['Liuliqiaodong', '六里桥东'], ['Liuli Qiao', '六里桥'], ['Qilizhuang', '七里庄'], ['Fengtai Dongdajie', '丰台东大街'], ['Fengtai Nanlu', '丰台南路'], ['Keyi Lu', '科怡路'], ['Fengtai Science Park', '丰台科技园'], ['Guogongzhuang', '郭公庄'],
  ],
  beijing10: [
    ['Bagou', '巴沟'], ['Suzhou Jie', '苏州街'], ['Haidian Huangzhuang', '海淀黄庄'], ['Zhichun Li', '知春里'], ['Zhichun Lu', '知春路'], ['Xitucheng', '西土城'], ['Mudanyuan', '牡丹园'], ['Jiande Men', '健德门'], ['Beitucheng', '北土城'], ['Anzhenmen', '安贞门'], ['Huixin Xijie Nankou', '惠新西街南口'], ['Shaoyaoju', '芍药居'], ['Taiyanggong', '太阳宫'], ['Sanyuan Qiao', '三元桥'], ['Liangma Qiao', '亮马桥'], ['Agricultural Exhibition Center', '农业展览馆'], ['Tuanjiehu', '团结湖'], ['Hujialou', '呼家楼'], ['Jintai Xizhao', '金台夕照'], ['Guomao', '国贸'], ['Shuangjing', '双井'], ['Jingsong', '劲松'], ['Panjia Yuan', '潘家园'], ['Shilihe', '十里河'], ['Fenzhong Si', '分钟寺'], ['Chengshou Si', '成寿寺'], ['Songjiazhuang', '宋家庄'], ['Shiliuzhuang', '石榴庄'], ['Dahong Men', '大红门'], ['Jiaomendong', '角门东'], ['Jiaomenxi', '角门西'], ['Caoqiao', '草桥'], ['Jijiamiao', '纪家庙'], ['Capital University of Economics & Business', '首经贸', ['CUEB', '首都经济贸易大学']], ['Fengtai Railway Station', '丰台站'], ['Niwa', '泥洼'], ['Xiju', '西局'], ['Liuli Qiao', '六里桥'], ['Lianhua Qiao', '莲花桥'], ['Gongzhufen', '公主坟'], ['Xidiaoyutai', '西钓鱼台'], ['Cishou Si', '慈寿寺'], ['Chedaogou', '车道沟'], ['Changchun Qiao', '长春桥'], ['Huoqiying', '火器营'],
  ],
  beijing11: [
    ['Moshikou', '模式口'], ["Jin'anqiao", '金安桥'], ["Beixin'an", '北辛安'], ['Shougang Park', '新首钢'],
  ],
  beijing12: [
    ['Sijiqing Qiao', '四季青桥'], ['Landianchang', '蓝靛厂'], ['Changchun Qiao', '长春桥'], ['Suzhou Qiao', '苏州桥'], ['Renmin University', '人民大学'], ['Dazhong Si', '大钟寺'], ['Jimen Qiao', '蓟门桥'], ['Beitaipingzhuang', '北太平庄'], ['Madian Qiao', '马甸桥'], ['Anhua Qiao', '安华桥'], ['Anzhen Qiao', '安贞桥'], ['Heping Xiqiao', '和平西桥'], ['Guangxi Men', '光熙门'], ['Xibahe', '西坝河'], ['Sanyuan Qiao', '三元桥'], ['Jiangtaixi', '将台西'], ['Gaojiayuan', '高家园'], ['Tuofangying', '驼房营'], ['Dongbaxi', '东坝西'], ['Dongbabei', '东坝北'],
  ],
  beijing13: [
    ['Xizhimen', '西直门'], ['Dazhong Si', '大钟寺'], ['Zhichun Lu', '知春路'], ['Wudao Kou', '五道口'], ['Shangdi', '上地'], ['Qinghe Railway Station', '清河站'], ["Xi'erqi", '西二旗'], ['Longze', '龙泽'], ['Huilong Guan', '回龙观'], ['Huoying', '霍营'], ['Lishui Qiao', '立水桥'], ['Bei Yuan', '北苑'], ['Wangjingxi', '望京西'], ['Shaoyaoju', '芍药居'], ['Guangxi Men', '光熙门'], ['Liufang', '柳芳'], ['Dongzhimen', '东直门'],
  ],
  beijing14: [
    ['Zhangguozhuang', '张郭庄'], ['Garden Expo Park', '园博园'], ['Dawayao', '大瓦窑'], ['Guozhuangzi', '郭庄子'], ['Dajing', '大井'], ['Qilizhuang', '七里庄'], ['Xiju', '西局'], ['Dongguantou', '东管头'], ['Lize Shangwuqu', '丽泽商务区'], ['Caihuying', '菜户营'], ['Xitieying', '西铁营'], ['Jingfengmen', '景风门'], ['Beijing South Railway Station', '北京南站'], ['Taoran Qiao', '陶然桥'], ['Yongdingmenwai', '永定门外'], ['Jingtai', '景泰'], ['Puhuangyu', '蒲黄榆'], ['Fangzhuang', '方庄'], ['Shilihe', '十里河'], ['Beijing University of Tech West Gate', '北工大西门', ['北京工业大学']], ['Pingle Yuan', '平乐园'], ['Jiulongshan', '九龙山'], ['Dawang Lu', '大望路'], ['Hongmiao', '红庙'], ['Jintai Lu', '金台路'], ['Chaoyang Park', '朝阳公园'], ['Zaoying', '枣营'], ['Dongfeng Beiqiao', '东风北桥'], ['Jiangtai', '将台'], ['Gaojiayuan', '高家园'], ['Wangjing South', '望京南'], ['Futong', '阜通'], ['Wangjing', '望京'], ['Donghuqu', '东湖渠'], ['Laiguangying', '来广营'], ['Shangezhuang', '善各庄'],
  ],
  beijing15: [
    ['Qinghua Donglu Xikou', '清华东路西口'], ['Liudao Kou', '六道口'], ['Beishatan', '北沙滩'], ['Olympic Park', '奥林匹克公园'], ['Anli Lu', '安立路'], ['Datunludong', '大屯路东'], ['Guanzhuang', '关庄'], ['Wangjingxi', '望京西'], ['Wangjing', '望京'], ['Wangjingdong', '望京东'], ['Cuigezhuang', '崔各庄'], ['Maquanying', '马泉营'], ['Sunhe', '孙河'], ['China International Exhibition Center', '国展'], ['Hualikan', '花梨坎'], ['Houshayu', '后沙峪'], ['Nanfaxin', '南法信'], ['Shimen', '石门'], ['Shunyi', '顺义'], ['Fengbo', '俸伯'],
  ],
  beijing16: [
    ["Bei'anhe", '北安河'], ['Wenyang Lu', '温阳路'], ['Daoxianghu Lu', '稻香湖路'], ['Tundian', '屯佃'], ['Yongfeng', '永丰'], ['Yongfengnan', '永丰南'], ['Xibeiwang', '西北旺'], ['Malianwa', '马连洼'], ['Nongda Nanlu', '农大南路'], ['Xi Yuan', '西苑'], ['Wanquanhe Qiao', '万泉河桥'], ['Suzhou Jie', '苏州街'], ['Suzhou Qiao', '苏州桥'], ['Wanshou Si', '万寿寺'], ['National Library', '国家图书馆'], ['Erligou', '二里沟'], ['Ganjia Kou', '甘家口'], ['Yuyuantan Park East Gate', '玉渊潭东门'], ['Muxidi', '木樨地'], ['Daguanying', '达官营'], ['Honglian Nanlu', '红莲南路'], ['Lize Shangwuqu', '丽泽商务区'], ['Dongguantounan', '东管头南'], ['Fengtai Railway Station', '丰台站'], ['Fengtai Nanlu', '丰台南路'], ['Fufengqiao', '富丰桥'], ['Kandan', '看丹'], ['Yushuzhuang', '榆树庄'], ['Hongtaizhuang', '洪泰庄'], ['Wanpingcheng', '宛平城'],
  ],
  beijing17: [
    ['Future Science City North', '未来科学城北'], ['Future Science City', '未来科学城'], ['Tiantongyuandong', '天通苑东'], ['Qingheying', '清河营'], ['Hongjunying', '红军营'], ['Wangjingxi', '望京西'], ['Taiyanggong', '太阳宫'], ['Xibahe', '西坝河'], ['Zuojiazhuang', '左家庄'], ["Workers' Stadium", '工人体育场'], ['Dongdaqiao', '东大桥'], ["Yong'an Li", '永安里'], ['Guangqumen Wai', '广渠门外'], ['Panjiayuanxi', '潘家园西'], ['Shilihe', '十里河'], ['Zhoujiazhuang', '周家庄'], ['Shibalidian', '十八里店'], ['Beishenshu', '北神树'], ['Ciqubei', '次渠北'], ['Ciqu', '次渠'], ['Jiahuihu', '嘉会湖'],
  ],
  beijing18: [
    ['Malianwa', '马连洼'], ['Shangdi Software Park', '上地软件园'], ['Dongbeiwang', '东北旺'], ['Longzexi', '龙泽西'], ['Huilongguan Xidajie', '回龙观西大街'], ['Wenhualu', '文华路'], ['Huilongguan Dongdajie', '回龙观东大街'], ['Huoyingdong', '霍营东'], ['Tiantongyuan', '天通苑'], ['Taipingzhuang', '太平庄'], ['Tiantongyuandong', '天通苑东'],
  ],
  beijing19: [
    ['Mudanyuan', '牡丹园'], ['Beitaipingzhuang', '北太平庄'], ['Jishuitan', '积水潭'], ["Ping'anli", '平安里'], ['Taipingqiao', '太平桥'], ['Niujie', '牛街', [], 'beijing-niujie-guanganmennei-complex'], ['Jingfengmen', '景风门'], ['Caoqiao', '草桥'], ['Xinfadi', '新发地'], ['Xingong', '新宫'],
  ],
  beijingyizhuang: [
    ['Songjiazhuang', '宋家庄'], ['Xiaocun', '肖村'], ['Xiaohong Men', '小红门'], ['Jiu Gong', '旧宫'], ['Yizhuang Qiao', '亦庄桥'], ['Yizhuang Culture Park', '亦庄文化园'], ['Wanyuan Jie', '万源街'], ['Rongjing Dongjie', '荣京东街'], ['Rongchang Dongjie', '荣昌东街'], ['Tongji Nanlu', '同济南路'], ['Jinghai Lu', '经海路'], ['Ciqunan', '次渠南'], ['Ciqu', '次渠'], ['Yizhuang Railway Station', '亦庄火车站'],
  ],
  beijingfangshan: [
    ['Dongguantounan', '东管头南'], ['Capital University of Economics & Business', '首经贸', ['CUEB', '首都经济贸易大学']], ['Huaxiang Dongqiao', '花乡东桥'], ['Baipenyao', '白盆窑'], ['Guogongzhuang', '郭公庄'], ['Dabaotai', '大葆台'], ['Daotian', '稻田'], ['Changyang', '长阳'], ['Libafang', '篱笆房'], ['Guangyang Cheng', '广阳城'], ['Liangxiang University Town North', '良乡大学城北', ['良乡大学', 'Liangxiang University', 'Beijing Institute of Technology', 'BIT', '北京理工大学']], ['Liangxiang University Town', '良乡大学城', ['良乡大学', 'Liangxiang University', 'Beijing Institute of Technology', 'BIT', '北京理工大学']], ['Liangxiang University Town West', '良乡大学城西', ['良乡大学', 'Liangxiang University', 'Beijing Institute of Technology', 'BIT', '北京理工大学']], ['Liangxiang Nanguan', '良乡南关'], ['Suzhuang', '苏庄'], ['Yancundong', '阎村东'],
  ],
  beijingyanfang: [
    ['Yancundong', '阎村东'], ['Zicaowu', '紫草坞'], ['Yancun', '阎村'], ['Xingcheng', '星城'], ['Dashihedong', '大石河东'], ['Magezhuang', '马各庄'], ['Raole Fu', '饶乐府'], ['Fangshan Chengguan', '房山城关'], ['Yanshan', '燕山'],
  ],
  beijings1: [
    ['Shichang', '石厂'], ['Xiaoyuan', '小园'], ['Liyuanzhuang', '栗园庄'], ["Shang'an", '上岸'], ['Qiaohuying', '桥户营'], ['Sidao Qiao', '四道桥'], ["Jin'anqiao", '金安桥'], ['Pingguoyuan', '苹果园'],
  ],
  beijingchangping: [
    ['Changping Xishankou', '昌平西山口'], ['Ming Tombs', '十三陵景区'], ['Changping', '昌平'], ['Changping Dongguan', '昌平东关'], ['Beishaowa', '北邵洼'], ['Nanshao', '南邵'], ['Shahe University Park', '沙河高教园', ['北京航空航天大学', 'Beihang University', 'BUAA', 'Shahe University']], ['Shahe', '沙河'], ['Gonghua Cheng', '巩华城'], ['Zhuxinzhuang', '朱辛庄'], ['Life Science Park', '生命科学园'], ["Xi'erqi", '西二旗'], ['Qinghe Railway Station', '清河站'], ['Zhufangbei', '朱房北'], ['Qinghe Xiaoyingqiao', '清河小营桥'], ['Xuezhiyuan', '学知园'], ['Liudao Kou', '六道口'], ['Xueyuanqiao', '学院桥'], ['Xitucheng', '西土城'], ['Jimen Qiao', '蓟门桥'],
  ],
  beijingcae: [
    ['Beixinqiao', '北新桥'], ['Dongzhimen', '东直门'], ['Sanyuanqiao', '三元桥'], ['PEK Terminal 3', '3号航站楼', ['PEK', 'Terminal 3', 'BCIA', 'ZBAA', 'Capital Airport', 'Beijing Airport', 'Peking Airport', 'Beijing Capital International Airport', '北京首都国际机场']], ['PEK Terminal 2', '2号航站楼', ['PEK', 'Terminal 2', 'BCIA', 'ZBAA', 'Capital Airport', 'Beijing Airport', 'Peking Airport', 'Beijing Capital International Airport', '北京首都国际机场'], undefined, [116.5870863, 40.078483]],
  ],
  beijingdae: [
    ['Lize Shangwuqu', '丽泽商务区'], ['Caoqiao', '草桥'], ['Daxing Xincheng', '大兴新城'], ['Daxing Airport', '大兴机场', ['BDIA', 'PKX', 'ZBAD', 'Beijing Daxing International Airport', '北京大兴国际机场']],
  ],
  beijingxijiao: [
    ['Fragrant Hills', '香山'], ['China National Botanical Garden', '国家植物园'], ["Wan'an", '万安'], ['Chapeng', '茶棚'], ['Summer Palace West Gate', '颐和园西门', ['Summer Palace', '颐和园']], ['Bagou', '巴沟'],
  ],
  beijingyizhuangt1: [
    ['Qu Zhuang', '屈庄'], ['Rongxing Jie', '融兴街'], ['Ruihe Zhuang', '瑞合庄'], ['Taiheqiaobei', '太和桥北'], ['Sihai Zhuang', '四海庄'], ['Jiuhao Cun', '九号村'], ['Taihe Lu', '泰河路'], ['Lujuandong', '鹿圈东'], ['Yizhuang Tongren', '亦庄同仁'], ['Rongchang Dongjie', '荣昌东街'], ['Beijing Etrong International Exhibition & Convention Center', '亦创会展中心'], ['Jinghai Yilu', '经海一路'], ['Dinghaiyuanxi', '定海园西'], ['Dinghai Yuan', '定海园'],
  ],
  beijingsubcenter: [
    ['Liangxiang', '良乡'], ['Fangshan East', '房山东'], ['Houlücun', '后吕村'], ['Yamenkou East', '衙门口东'], ['Beijing West', '北京西'], ['Beijing', '北京'], ['Beijing East', '北京东'], ['Zhongcang', '中仓'], ['Qiaozhuang East', '乔庄东'],
  ],
  beijings2: [
    ['Huangtudian', '黄土店', [], 'beijing-huangtudian-huoying-complex'], ['Nankou', '南口'], ['Badaling', '八达岭'], ['Yanqing', '延庆'], ['Kangzhuang', '康庄'], ['Shacheng', '沙城'],
  ],
  beijinghuairou: [
    ['Beijing North', '北京北', [], 'beijing-beijingnorth-xizhimen-complex'], ['Qinghe', '清河'], ['Changping North', '昌平北'], ['Yangqi Lake', '雁栖湖'], ['Huairou North', '怀柔北'], ['Heishansi', '黑山寺'], ['Gubeikou', '古北口'],
  ],
  beijingtongmi: [
    ['Tongzhou West', '通州西'], ['Shunyi', '顺义', [], 'beijing-shunyi-shimen-complex'], ['Niulanshan', '牛栏山'], ['Huairou', '怀柔'], ['Miyun North', '密云北'], ['Yanqihu', '雁栖湖'], ['Huairou North', '怀柔北'],
  ],
}

const normalize = (value) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '')

const coordKey = (coords, precision = 6) => coords.map((v) => Number(v).toFixed(precision)).join(',')

const excludedRouteBounds = [
  {
    lineId: 'beijing4',
    minLon: 117.0,
    maxLon: 117.3,
    minLat: 39.1,
    maxLat: 39.35,
  },
]

const getLineStringBounds = (coords) => {
  const bounds = {
    minLon: Infinity,
    maxLon: -Infinity,
    minLat: Infinity,
    maxLat: -Infinity,
  }
  coords.forEach(([lon, lat]) => {
    bounds.minLon = Math.min(bounds.minLon, lon)
    bounds.maxLon = Math.max(bounds.maxLon, lon)
    bounds.minLat = Math.min(bounds.minLat, lat)
    bounds.maxLat = Math.max(bounds.maxLat, lat)
  })
  return bounds
}

const isExcludedRoutePart = (lineId, coords) => {
  const bounds = getLineStringBounds(coords)
  return excludedRouteBounds.some(
    (excluded) =>
      excluded.lineId === lineId &&
      bounds.minLon >= excluded.minLon &&
      bounds.maxLon <= excluded.maxLon &&
      bounds.minLat >= excluded.minLat &&
      bounds.maxLat <= excluded.maxLat,
  )
}

const excludedStationCoords = [
  {
    station: 'Tiantongyuandong',
    coords: [116.437796, 40.0670587],
    tolerance: 0.0001,
  },
  {
    station: 'Dongzhimen',
    lineIds: new Set(['beijing2', 'beijingcae']),
    coords: [116.428548, 39.9417476],
    tolerance: 0.0001,
  },
  {
    station: 'Dongzhimen',
    lineIds: new Set(['beijing2', 'beijingcae']),
    coords: [116.4294829, 39.9400378],
    tolerance: 0.0001,
  },
  {
    station: 'Xizhimen',
    lineIds: new Set(['beijing13']),
    coords: [116.3492348, 39.9392172],
    tolerance: 0.0003,
  },
  {
    station: 'Jishuitan',
    lineIds: new Set(['beijing19']),
    coords: [116.3670284, 39.9473306],
    tolerance: 0.0001,
  },
  {
    station: 'Yonghegong Lama Temple',
    lineIds: new Set(['beijing5']),
    coords: [116.4115118, 39.9479201],
    tolerance: 0.0001,
  },
  {
    station: 'Lize Shangwuqu',
    lineIds: new Set(['beijingdae']),
    coords: [116.32720322, 39.8677079],
    tolerance: 0.0002,
  },
  {
    station: 'Lize Shangwuqu',
    lineIds: new Set(['beijingdae']),
    coords: [116.3256029, 39.8662759],
    tolerance: 0.0002,
  },
  {
    station: 'Xihuangcun',
    lineIds: new Set(['beijing6']),
    coords: [116.1977292, 39.9295933],
    tolerance: 0.0001,
  },
  {
    station: "Ping'anli",
    lineIds: new Set(['beijing19']),
    coords: [116.3664902, 39.9323067],
    tolerance: 0.0001,
  },
  {
    station: 'Nanluogu Xiang',
    lineIds: new Set(['beijing6']),
    coords: [116.3976416, 39.9323178],
    tolerance: 0.0001,
  },
  {
    station: 'Shuang Qiao',
    lineIds: new Set(['beijingbatong']),
    coords: [116.5641283, 39.899417],
    tolerance: 0.0002,
  },
]

const stationCoordOverrides = [
  {
    station: 'Dongzhimen',
    from: [116.4276776, 39.9397031],
    to: [116.427698, 39.9400251],
    tolerance: 0.0001,
  },
]

const fixedStationCoords = [
  { station: 'Chaoyang Men', to: [116.4283807, 39.9230469] },
  { station: 'Jianguomen', to: [116.4295753, 39.9071505] },
  { station: 'Beijing Railway Station', lineIds: new Set(['beijing2']), to: [116.4208933, 39.9035872] },
  { station: 'Chongwen Men', to: [116.412331, 39.8997532] },
  { station: 'Qianmen', to: [116.3915782, 39.8987283] },
  { station: 'Changchun Jie', to: [116.3571019, 39.8980431] },
  { station: 'Fuxingmen', to: [116.350491, 39.9058426] },
  { station: 'Chegongzhuang', to: [116.349652, 39.9310118] },
  { station: 'Xizhimen', lineIds: new Set(['beijing2', 'beijing4']), to: [116.3493311, 39.9391415] },
  { station: 'Gulou Dajie', to: [116.3877005, 39.9475297] },
  { station: 'Dongdaqiao', to: [116.4442178, 39.9216212] },
  { station: 'Zhushikou', to: [116.3921809, 39.8899141] },
  { station: 'Daguanying', to: [116.3289235, 39.8883765] },
  { station: 'Liuli Qiao', to: [116.2967997, 39.8787277] },
  { station: 'Jiulongshan', to: [116.4716733, 39.8919136] },
  { station: 'Shilihe', lineIds: new Set(['beijing10', 'beijing14']), to: [116.4542085, 39.8661179] },
  { station: 'Shilihe', lineIds: new Set(['beijing17']), to: [116.4522405, 39.8648262] },
  { station: 'Yongdingmenwai', to: [116.393026, 39.8661038] },
  { station: 'Beijing South Railway Station', to: [116.372743, 39.8636301] },
  { station: 'Dongguantounan', to: [116.3166419, 39.8532466] },
  { station: 'Pingguoyuan', lineIds: new Set(['beijing1', 'beijing6']), to: [116.1721867, 39.9246006] },
  { station: 'Pingguoyuan', lineIds: new Set(['beijings1']), to: [116.172772, 39.9240097] },
  { station: 'Cishou Si', to: [116.2894189, 39.9316301] },
  { station: 'Baishiqiaonan', to: [116.3194049, 39.9312572] },
  { station: "Ping'anli", lineIds: new Set(['beijing6']), to: [116.3647504, 39.9313022] },
  { station: 'Dongsi', to: [116.4116757, 39.9229804] },
  { station: 'Hujialou', to: [116.4554215, 39.9219363] },
  { station: 'Tuanjiehu', to: [116.4556006, 39.9323917] },
  { station: 'Xibahe', to: [116.4349455, 39.9651345] },
  { station: 'Fragrant Hills', to: [116.1980882, 39.9927735] },
]

const isExcludedStationCoord = (lineId, stop, coords) =>
  excludedStationCoords.some((entry) => {
    if (entry.station !== stop.en) return false
    if (entry.lineIds && !entry.lineIds.has(lineId)) return false
    return (
      Math.abs(coords[0] - entry.coords[0]) <= entry.tolerance &&
      Math.abs(coords[1] - entry.coords[1]) <= entry.tolerance
    )
  })

const getFixedStationCoords = (lineId, stop) => {
  const fixed = fixedStationCoords.find((entry) => {
    if (entry.station !== stop.en) return false
    if (entry.lineIds && !entry.lineIds.has(lineId)) return false
    return true
  })
  return fixed?.to ?? null
}

const applyStationCoordOverride = (stop, coords) => {
  const override = stationCoordOverrides.find((entry) => {
    if (entry.station !== stop.en) return false
    return (
      Math.abs(coords[0] - entry.from[0]) <= entry.tolerance &&
      Math.abs(coords[1] - entry.from[1]) <= entry.tolerance
    )
  })
  return override ? override.to : coords
}

const getCentroid = (coordinates) => {
  const points = []
  const walk = (value) => {
    if (Array.isArray(value) && typeof value[0] === 'number') points.push(value)
    else if (Array.isArray(value)) value.forEach(walk)
  }
  walk(coordinates)
  const sum = points.reduce((acc, [lng, lat]) => [acc[0] + lng, acc[1] + lat], [0, 0])
  return [sum[0] / points.length, sum[1] / points.length]
}

const getNames = (properties = {}) => {
  const raw = []
  const keys = [
    'name',
    'name:en',
    'name:zh',
    'name:zh-Hans',
    'name:zh-Hant',
    'name:zh-Latn-pinyin',
    'official_name',
    'official_name:en',
    'alt_name',
    'alt_name:en',
    'alt_name:zh',
    'old_name',
    'old_name:en',
    'old_name:zh',
  ]
  keys.forEach((key) => {
    const value = properties[key]
    if (typeof value === 'string') {
      value.split(/[;/,，、()（）·•]+/).forEach((part) => {
        const trimmed = part.trim()
        if (trimmed) raw.push(trimmed)
      })
    }
  })
  return Array.from(new Set(raw))
}

const getSearchText = (properties = {}) =>
  [
    properties.name,
    properties['name:en'],
    properties['name:zh'],
    properties['name:zh-Hans'],
    properties['name:zh-Hant'],
    properties.ref,
    properties.subwayline,
  ]
    .filter(Boolean)
    .join(' ')

const asStop = ([en, zh, aliases = [], clusterKey, coords]) => ({ en, zh, aliases, clusterKey, coords })

const buildAlternateNames = (stop, matchedProperties = {}) => {
  const alts = new Set([stop.en, stop.zh])
  const geoKeys = ['name:en', 'name:zh', 'name:zh-Hans', 'name:zh-Hant', 'name:zh-Latn-pinyin']
  geoKeys.forEach((key) => {
    if (matchedProperties[key]) alts.add(matchedProperties[key])
  })
  if (stop.zh) {
    alts.add(toTraditionalChinese(stop.zh))
    alts.add(pinyin(stop.zh, { toneType: 'none', type: 'array' }).join(' '))
  }
  stop.aliases?.forEach((alias) => alts.add(alias))
  return Array.from(alts).filter(Boolean)
}

const buildCandidates = (stop) =>
  Array.from(new Set([stop.en, stop.zh, ...(stop.aliases ?? [])].filter(Boolean)))

const main = () => {
  const stationGeo = JSON.parse(fs.readFileSync(stationGeoPath, 'utf8'))
  const routeGeo = JSON.parse(fs.readFileSync(routeGeoPath, 'utf8'))
  const pointFeatures = stationGeo.features.filter(
    (f) => f.geometry?.type === 'Point' || f.geometry?.type === 'Polygon',
  )
  const indexed = pointFeatures.map((feature) => ({
    feature,
    names: getNames(feature.properties).map(normalize),
  }))

  const findMatches = (stop) => {
    const candidates = buildCandidates(stop).map(normalize)
    return indexed.filter((entry) =>
      entry.names.some((name) =>
        candidates.some((candidate) => name === candidate || name.includes(candidate)),
      ),
    )
  }

  const featuresOut = []
  const missingStations = []
  let idCounter = 0

  Object.entries(stationGroups).forEach(([lineId, rawStops]) => {
    rawStops.map(asStop).forEach((stop, order) => {
      if (Array.isArray(stop.coords) && stop.coords.length === 2) {
        featuresOut.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: stop.coords },
          properties: {
            id: idCounter,
            name: stop.en,
            display_name: stop.zh ? `${stop.en} (${stop.zh})` : stop.en,
            line: lineId,
            alternate_names: buildAlternateNames(stop),
            order,
            ...(stop.clusterKey ? { cluster_key: stop.clusterKey } : {}),
          },
          id: idCounter,
        })
        idCounter += 1
        return
      }

      const matches = findMatches(stop)
      if (matches.length === 0) {
        missingStations.push({ line: lineId, station: stop.en, zh: stop.zh })
        return
      }

      const seenCoords = new Set()
      let addedCount = 0
      const fixedCoords = getFixedStationCoords(lineId, stop)
      if (fixedCoords) {
        featuresOut.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: fixedCoords },
          properties: {
            id: idCounter,
            name: stop.en,
            display_name: stop.zh ? `${stop.en} (${stop.zh})` : stop.en,
            line: lineId,
            alternate_names: buildAlternateNames(stop, matches[0].feature.properties),
            order,
            ...(stop.clusterKey ? { cluster_key: stop.clusterKey } : {}),
          },
          id: idCounter,
        })
        idCounter += 1
        return
      }
      matches.forEach((match) => {
        if (addedCount >= 2) return
        const geom = match.feature.geometry
        const rawCoords = geom.type === 'Point' ? geom.coordinates : getCentroid(geom.coordinates)
        if (isExcludedStationCoord(lineId, stop, rawCoords)) return
        const coords = applyStationCoordOverride(stop, rawCoords)
        const key = coordKey(coords)
        if (seenCoords.has(key)) return
        seenCoords.add(key)
        featuresOut.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: coords },
          properties: {
            id: idCounter,
            name: stop.en,
            display_name: stop.zh ? `${stop.en} (${stop.zh})` : stop.en,
            line: lineId,
            alternate_names: buildAlternateNames(stop, match.feature.properties),
            order,
            ...(stop.clusterKey ? { cluster_key: stop.clusterKey } : {}),
          },
          id: idCounter,
        })
        idCounter += 1
        addedCount += 1
      })
    })
  })

  const routeFeatures = []
  const missingRoutes = []
  const singleRouteLines = []
  lineSpecs.forEach((line) => {
    const coords = []
    const keywords = [...line.keywords, ...(routeKeywordAdditions[line.id] ?? [])]
    routeGeo.features
      .filter((f) => f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString')
      .forEach((feature) => {
        const text = getSearchText(feature.properties)
        if (!keywords.some((keyword) => text.includes(keyword))) return
        const routeParts =
          feature.geometry.type === 'LineString'
            ? [feature.geometry.coordinates]
            : feature.geometry.coordinates
        coords.push(
          ...routeParts.filter((part) => !isExcludedRoutePart(line.id, part)),
        )
      })
    if (coords.length === 0) {
      missingRoutes.push(line.id)
      return
    }
    if (coords.length === 1) singleRouteLines.push(line.id)
    routeFeatures.push({
      type: 'Feature',
      geometry: { type: 'MultiLineString', coordinates: coords },
      properties: { line: line.id, name: line.name, color: line.color, order: line.order },
    })
  })

  if (missingStations.length) {
    console.warn('Missing station matches:', JSON.stringify(missingStations, null, 2))
  }
  if (missingRoutes.length) {
    console.warn('Missing routes:', missingRoutes.join(', '))
  }
  if (singleRouteLines.length) {
    throw new Error(`Expected multiple line strings but only found one for: ${singleRouteLines.join(', ')}`)
  }

  const linesOut = lineSpecs.reduce((acc, line) => {
    const useDarkText = ['#FFC56E', '#88D400', '#F5D40A', '#D5A9A2', '#D4A5CA'].includes(line.color)
    acc[line.id] = {
      name: line.name,
      color: line.color,
      backgroundColor: line.color,
      textColor: useDarkText ? '#000000' : '#ffffff',
      statsColor: line.color,
      order: line.order,
    }
    if (line.icon) {
      acc[line.id].icon = `asia/china/beijing/${line.icon}`
      if (!suburbanRailwayLineIds.has(line.id)) {
        acc[line.id].badgeShape = 'wide'
        acc[line.id].badgeFit = 'contain'
        const aspectRatio = readPngAspectRatio(line.icon)
        if (aspectRatio) {
          acc[line.id].badgeAspectRatio = aspectRatio
        }
      }
    }
    return acc
  }, {})

  fs.writeFileSync(outFeatures, JSON.stringify({ type: 'FeatureCollection', features: featuresOut }, null, 2))
  fs.writeFileSync(outRoutes, JSON.stringify({ type: 'FeatureCollection', features: routeFeatures }, null, 2))
  fs.writeFileSync(outLines, JSON.stringify(linesOut, null, 2))
}

main()

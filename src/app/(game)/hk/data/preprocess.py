import json
from pathlib import Path

lines = [
    {
        "code": "EAL",
        "name": "East Rail Line",
        "color": "#53B7E8",
        "stations": [
            {
                "english": "Admiralty",
                "traditional": "金鐘",
                "simplified": "金钟",
                "jyutping": "gam zung",
                "pinyin": "jin zhong",
                "lat": 22.279451691190783,
                "lon": 114.16450623067786,
            },
            {
                "english": "Exhibition Centre",
                "traditional": "會展",
                "simplified": "会展",
                "jyutping": "wui zin",
                "pinyin": "hui zhan",
                "lat": 22.281654585488486,
                "lon": 114.17539305350553,
            },
            {
                "english": "Hung Hom",
                "traditional": "紅磡",
                "simplified": "红磡",
                "jyutping": "hung ham",
                "pinyin": "hong kan",
                "lat": 22.302877464725512,
                "lon": 114.18212301530004,
            },
            {
                "english": "Mong Kok East",
                "traditional": "旺角東",
                "simplified": "旺角东",
                "jyutping": "wong gok dung",
                "pinyin": "wang jiao dong",
                "lat": 22.322021065675294,
                "lon": 114.17253026053879,
            },
            {
                "english": "Kowloon Tong",
                "traditional": "九龍塘",
                "simplified": "九龙塘",
                "jyutping": "gau lung tong",
                "pinyin": "jiu long tang",
                "lat": 22.336918479316058,
                "lon": 114.17587958143326,
            },
            {
                "english": "Tai Wai",
                "traditional": "大圍",
                "simplified": "大围",
                "jyutping": "daai wai",
                "pinyin": "da wei",
                "lat": 22.372858580324074,
                "lon": 114.17805147091714,
            },
            {
                "english": "Sha Tin",
                "traditional": "沙田",
                "simplified": "沙田",
                "jyutping": "saa tin",
                "pinyin": "sha tian",
                "lat": 22.381892572701396,
                "lon": 114.18691296452803,
            },
            {
                "english": "Fo Tan",
                "traditional": "火炭",
                "simplified": "火炭",
                "jyutping": "fo taan",
                "pinyin": "huo tan",
                "lat": 22.395098739948953,
                "lon": 114.19814484466326,
            },
            {
                "english": "Racecourse",
                "traditional": "馬場",
                "simplified": "马场",
                "jyutping": "maa coeng",
                "pinyin": "ma chang",
                "lat": 22.400940456049437,
                "lon": 114.20320995692808,
            },
            {
                "english": "University",
                "traditional": "大學",
                "simplified": "大学",
                "jyutping": "daai hok",
                "pinyin": "da xue",
                "lat": 22.41314764938037,
                "lon": 114.20993121203098,
            },
            {
                "english": "Tai Po Market",
                "traditional": "大埔墟",
                "simplified": "大埔墟",
                "jyutping": "daai bou heoi",
                "pinyin": "da bu xu",
                "lat": 22.444565376991882,
                "lon": 114.17049225525707,
            },
            {
                "english": "Tai Wo",
                "traditional": "太和",
                "simplified": "太和",
                "jyutping": "taai wo",
                "pinyin": "tai he",
                "lat": 22.450989381755505,
                "lon": 114.16120410671844,
            },
            {
                "english": "Fanling",
                "traditional": "粉嶺",
                "simplified": "粉岭",
                "jyutping": "fan ling",
                "pinyin": "fen ling",
                "lat": 22.492105232213376,
                "lon": 114.1386154903359,
            },
            {
                "english": "Sheung Shui",
                "traditional": "上水",
                "simplified": "上水",
                "jyutping": "soeng seoi",
                "pinyin": "shang shui",
                "lat": 22.501279515859835,
                "lon": 114.1279266861369,
            },
            {
                "english": "Lok Ma Chau",
                "traditional": "落馬洲",
                "simplified": "落马洲",
                "jyutping": "lok maa zau",
                "pinyin": "luo ma zhou",
                "lat": 22.514829987805964,
                "lon": 114.06561824609298,
            },
            {
                "english": "Lo Wu",
                "traditional": "羅湖",
                "simplified": "罗湖",
                "jyutping": "lo wu",
                "pinyin": "luo hu",
                "lat": 22.528164603772098,
                "lon": 114.11337715986733,
            },
        ],
        "segments": [
            [
                "Admiralty",
                "Exhibition Centre",
                "Hung Hom",
                "Mong Kok East",
                "Kowloon Tong",
                "Tai Wai",
                "Sha Tin",
                "Fo Tan",
                "University",
                "Tai Po Market",
                "Tai Wo",
                "Fanling",
                "Sheung Shui",
                "Lo Wu",
            ],
            ["Fo Tan", "Racecourse"],
            ["Sheung Shui", "Lok Ma Chau"],
        ],
    },
    {
        "code": "TCL",
        "name": "Tung Chung Line",
        "color": "#F7943E",
        "stations": [
            {
                "english": "Hong Kong",
                "traditional": "香港",
                "simplified": "香港",
                "jyutping": "hoeng gong",
                "pinyin": "xiang gang",
                "lat": 22.28469909663648,
                "lon": 114.1581328614588,
            },
            {
                "english": "Kowloon",
                "traditional": "九龍",
                "simplified": "九龙",
                "jyutping": "gau lung",
                "pinyin": "jiu long",
                "lat": 22.30431687096305,
                "lon": 114.1614472967348,
            },
            {
                "english": "Olympic",
                "traditional": "奧運",
                "simplified": "奥运",
                "jyutping": "ou wan",
                "pinyin": "ao yun",
                "lat": 22.31785213505149,
                "lon": 114.16011585957722,
            },
            {
                "english": "Nam Cheong",
                "traditional": "南昌",
                "simplified": "南昌",
                "jyutping": "naam coeng",
                "pinyin": "nan chang",
                "lat": 22.326794330032275,
                "lon": 114.1536484601782,
            },
            {
                "english": "Lai King",
                "traditional": "荔景",
                "simplified": "荔景",
                "jyutping": "lai ging",
                "pinyin": "li jing",
                "lat": 22.34845562951537,
                "lon": 114.12611713173048,
            },
            {
                "english": "Tsing Yi",
                "traditional": "青衣",
                "simplified": "青衣",
                "jyutping": "cing ji",
                "pinyin": "qing yi",
                "lat": 22.358559071787663,
                "lon": 114.10761612624462,
            },
            {
                "english": "Sunny Bay",
                "traditional": "欣澳",
                "simplified": "欣澳",
                "jyutping": "jan ou",
                "pinyin": "xin ao",
                "lat": 22.33174232324258,
                "lon": 114.02886487334575,
            },
            {
                "english": "Tung Chung",
                "traditional": "東涌",
                "simplified": "东涌",
                "jyutping": "dung cung",
                "pinyin": "dong chong",
                "lat": 22.28930066516548,
                "lon": 113.94137802709538,
            },
        ],
    },
    {
        "code": "TML",
        "name": "Tuen Ma Line",
        "color": "#923011",
        "stations": [
            {
                "english": "Tuen Mun",
                "traditional": "屯門",
                "simplified": "屯门",
                "jyutping": "tyun mun",
                "pinyin": "tun men",
                "lat": 22.394923283180795,
                "lon": 113.97307945548198,
            },
            {
                "english": "Siu Hong",
                "traditional": "兆康",
                "simplified": "兆康",
                "jyutping": "siu hong",
                "pinyin": "zhao kang",
                "lat": 22.411785542242168,
                "lon": 113.97900852849487,
            },
            {
                "english": "Tin Shui Wai",
                "traditional": "天水圍",
                "simplified": "天水围",
                "jyutping": "tin seoi wai",
                "pinyin": "tian shui wei",
                "lat": 22.4482460534469,
                "lon": 114.00475345696616,
            },
            {
                "english": "Long Ping",
                "traditional": "朗屏",
                "simplified": "朗屏",
                "jyutping": "long ping",
                "pinyin": "lang ping",
                "lat": 22.44769027872071,
                "lon": 114.02548579688025,
            },
            {
                "english": "Yuen Long",
                "traditional": "元朗",
                "simplified": "元朗",
                "jyutping": "jyun long",
                "pinyin": "yuan lang",
                "lat": 22.44611657369744,
                "lon": 114.03471595249161,
            },
            {
                "english": "Kam Sheung Road",
                "traditional": "錦上路",
                "simplified": "锦上路",
                "jyutping": "gam soeng lou",
                "pinyin": "jin shang lu",
                "lat": 22.43483358900595,
                "lon": 114.063482887404,
            },
            {
                "english": "Tsuen Wan West",
                "traditional": "荃灣西",
                "simplified": "荃湾西",
                "jyutping": "cyun waan sai",
                "pinyin": "quan wan xi",
                "lat": 22.368424802552358,
                "lon": 114.1096452416372,
            },
            {
                "english": "Mei Foo",
                "traditional": "美孚",
                "simplified": "美孚",
                "jyutping": "mei fu",
                "pinyin": "mei fu",
                "lat": 22.33778438348702,
                "lon": 114.13640810965138,
            },
            {
                "english": "Nam Cheong",
                "traditional": "南昌",
                "simplified": "南昌",
                "jyutping": "naam coeng",
                "pinyin": "nan chang",
                "lat": 22.326794330032275,
                "lon": 114.1536484601782,
            },
            {
                "english": "Austin",
                "traditional": "柯士甸",
                "simplified": "柯士甸",
                "jyutping": "o si din",
                "pinyin": "ke shi dian",
                "lat": 22.305288753547817,
                "lon": 114.16608918034778,
            },
            {
                "english": "East Tsim Sha Tsui",
                "traditional": "尖東",
                "simplified": "尖东",
                "jyutping": "zim dung",
                "pinyin": "jian dong",
                "lat": 22.29483743790022,
                "lon": 114.17341128517072,
            },
            {
                "english": "Hung Hom",
                "traditional": "紅磡",
                "simplified": "红磡",
                "jyutping": "hung ham",
                "pinyin": "hong kan",
                "lat": 22.302877464725512,
                "lon": 114.18212301530004,
            },
            {
                "english": "Ho Man Tin",
                "traditional": "何文田",
                "simplified": "何文田",
                "jyutping": "ho man tin",
                "pinyin": "he wen tian",
                "lat": 22.309435075135703,
                "lon": 114.18264455118644,
            },
            {
                "english": "To Kwa Wan",
                "traditional": "土瓜灣",
                "simplified": "土瓜湾",
                "jyutping": "tou gwaa waan",
                "pinyin": "tu gua wan",
                "lat": 22.317318228160875,
                "lon": 114.1876313784972,
            },
            {
                "english": "Sung Wong Toi",
                "traditional": "宋皇臺",
                "simplified": "宋皇台",
                "jyutping": "sung wong toi",
                "pinyin": "song huang tai",
                "lat": 22.325926721984647,
                "lon": 114.19133534501256,
            },
            {
                "english": "Kai Tak",
                "traditional": "啟德",
                "simplified": "启德",
                "jyutping": "kai dak",
                "pinyin": "qi de",
                "lat": 22.33056160220436,
                "lon": 114.19954912813168,
            },
            {
                "english": "Diamond Hill",
                "traditional": "鑽石山",
                "simplified": "钻石山",
                "jyutping": "zyun sek saan",
                "pinyin": "zuan shi shan",
                "lat": 22.340287925682947,
                "lon": 114.20026760050594,
            },
            {
                "english": "Hin Keng",
                "traditional": "顯徑",
                "simplified": "显径",
                "jyutping": "hin ging",
                "pinyin": "xian jing",
                "lat": 22.36388253638616,
                "lon": 114.17073067130006,
            },
            {
                "english": "Tai Wai",
                "traditional": "大圍",
                "simplified": "大围",
                "jyutping": "daai wai",
                "pinyin": "da wei",
                "lat": 22.372858580324074,
                "lon": 114.17805147091714,
            },
            {
                "english": "Che Kung Temple",
                "traditional": "車公廟",
                "simplified": "车公庙",
                "jyutping": "ce gung miu",
                "pinyin": "che gong miao",
                "lat": 22.37477146109767,
                "lon": 114.18589726381069,
            },
            {
                "english": "Sha Tin Wai",
                "traditional": "沙田圍",
                "simplified": "沙田围",
                "jyutping": "saa tin wai",
                "pinyin": "sha tian wei",
                "lat": 22.377077165075086,
                "lon": 114.19492248028678,
            },
            {
                "english": "City One",
                "traditional": "第一城",
                "simplified": "第一城",
                "jyutping": "dai jat sing",
                "pinyin": "di yi cheng",
                "lat": 22.38296668575128,
                "lon": 114.20358780143104,
            },
            {
                "english": "Shek Mun",
                "traditional": "石門",
                "simplified": "石门",
                "jyutping": "sek mun",
                "pinyin": "shi men",
                "lat": 22.387772118965025,
                "lon": 114.20836651683648,
            },
            {
                "english": "Tai Shui Hang",
                "traditional": "大水坑",
                "simplified": "大水坑",
                "jyutping": "daai seoi haang",
                "pinyin": "da shui keng",
                "lat": 22.408428443290713,
                "lon": 114.22266602102428,
            },
            {
                "english": "Heng On",
                "traditional": "恒安",
                "simplified": "恒安",
                "jyutping": "hang on",
                "pinyin": "heng an",
                "lat": 22.417381451184593,
                "lon": 114.22568329741958,
            },
            {
                "english": "Ma On Shan",
                "traditional": "馬鞍山",
                "simplified": "马鞍山",
                "jyutping": "maa on saan",
                "pinyin": "ma an shan",
                "lat": 22.42483260037374,
                "lon": 114.23159269042091,
            },
            {
                "english": "Wu Kai Sha",
                "traditional": "烏溪沙",
                "simplified": "乌溪沙",
                "jyutping": "wu kai saa",
                "pinyin": "wu xi sha",
                "lat": 22.429225695682362,
                "lon": 114.24378428528318,
            },
        ],
    },
    {
        "code": "AEL",
        "name": "Airport Express",
        "color": "#00888A",
        "stations": [
            {
                "english": "Hong Kong",
                "traditional": "香港",
                "simplified": "香港",
                "jyutping": "hoeng gong",
                "pinyin": "xiang gang",
                "lat": 22.28469909663648,
                "lon": 114.1581328614588,
            },
            {
                "english": "Kowloon",
                "traditional": "九龍",
                "simplified": "九龙",
                "jyutping": "gau lung",
                "pinyin": "jiu long",
                "lat": 22.30431687096305,
                "lon": 114.1614472967348,
            },
            {
                "english": "Tsing Yi",
                "traditional": "青衣",
                "simplified": "青衣",
                "jyutping": "cing ji",
                "pinyin": "qing yi",
                "lat": 22.358559071787663,
                "lon": 114.10761612624462,
            },
            {
                "english": "Airport",
                "traditional": "機場",
                "simplified": "机场",
                "jyutping": "gei coeng",
                "pinyin": "ji chang",
                "lat": 22.315846762478273,
                "lon": 113.93652342638113,
            },
            {
                "english": "AsiaWorld-Expo",
                "traditional": "亞洲國際博覽館",
                "simplified": "亚洲国际博览馆",
                "jyutping": "aa zau gwok zai bok laam gun",
                "pinyin": "ya zhou guo ji bo lan guan",
                "aliases": ["Asia World Expo", "AsiaWorld Expo"],
                "lat": 22.32083248493315,
                "lon": 113.94179214644502,
            },
        ],
    },
    {
        "code": "DRL",
        "name": "Disneyland Resort Line",
        "color": "#F173AC",
        "stations": [
            {
                "english": "Sunny Bay",
                "traditional": "欣澳",
                "simplified": "欣澳",
                "jyutping": "jan ou",
                "pinyin": "xin ao",
                "lat": 22.33174232324258,
                "lon": 114.02886487334575,
            },
            {
                "english": "Disneyland Resort",
                "traditional": "迪士尼",
                "simplified": "迪士尼",
                "jyutping": "dik si nei",
                "pinyin": "di shi ni",
                "aliases": ["Disneyland", "Hong Kong Disneyland"],
                "lat": 22.315464112275215,
                "lon": 114.04510102620337,
            },
        ],
    },
    {
        "code": "KTL",
        "name": "Kwun Tong Line",
        "color": "#00AB4E",
        "stations": [
            {
                "english": "Whampoa",
                "traditional": "黃埔",
                "simplified": "黄埔",
                "jyutping": "wong bou",
                "pinyin": "huang pu",
                "lat": 22.305069099211504,
                "lon": 114.18954379086435,
            },
            {
                "english": "Ho Man Tin",
                "traditional": "何文田",
                "simplified": "何文田",
                "jyutping": "ho man tin",
                "pinyin": "he wen tian",
                "lat": 22.309435075135703,
                "lon": 114.18264455118644,
            },
            {
                "english": "Yau Ma Tei",
                "traditional": "油麻地",
                "simplified": "油麻地",
                "jyutping": "jau maa dei",
                "pinyin": "you ma di",
                "lat": 22.31287598860284,
                "lon": 114.17060538622357,
            },
            {
                "english": "Mong Kok",
                "traditional": "旺角",
                "simplified": "旺角",
                "jyutping": "wong gok",
                "pinyin": "wang jiao",
                "lat": 22.319269393084312,
                "lon": 114.16932094752586,
            },
            {
                "english": "Prince Edward",
                "traditional": "太子",
                "simplified": "太子",
                "jyutping": "taai zi",
                "pinyin": "tai zi",
                "lat": 22.325073609415977,
                "lon": 114.1683590387622,
            },
            {
                "english": "Shek Kip Mei",
                "traditional": "石硤尾",
                "simplified": "石硖尾",
                "jyutping": "sek gip mei",
                "pinyin": "shi xia wei",
                "lat": 22.332118323185885,
                "lon": 114.16876823566055,
            },
            {
                "english": "Kowloon Tong",
                "traditional": "九龍塘",
                "simplified": "九龙塘",
                "jyutping": "gau lung tong",
                "pinyin": "jiu long tang",
                "lat": 22.336918479316058,
                "lon": 114.17587958143326,
            },
            {
                "english": "Lok Fu",
                "traditional": "樂富",
                "simplified": "乐富",
                "jyutping": "lok fu",
                "pinyin": "le fu",
                "lat": 22.3380572216468,
                "lon": 114.18699708123006,
            },
            {
                "english": "Wong Tai Sin",
                "traditional": "黃大仙",
                "simplified": "黄大仙",
                "jyutping": "wong daai sin",
                "pinyin": "huang da xian",
                "lat": 22.341698179174568,
                "lon": 114.19378307818303,
            },
            {
                "english": "Diamond Hill",
                "traditional": "鑽石山",
                "simplified": "钻石山",
                "jyutping": "zyun sek saan",
                "pinyin": "zuan shi shan",
                "lat": 22.340287925682947,
                "lon": 114.20026760050594,
            },
            {
                "english": "Choi Hung",
                "traditional": "彩虹",
                "simplified": "彩虹",
                "jyutping": "coi hung",
                "pinyin": "cai hong",
                "lat": 22.334918011169464,
                "lon": 114.20892840468169,
            },
            {
                "english": "Kowloon Bay",
                "traditional": "九龍灣",
                "simplified": "九龙湾",
                "jyutping": "gau lung waan",
                "pinyin": "jiu long wan",
                "lat": 22.32323008339495,
                "lon": 114.21392993348461,
            },
            {
                "english": "Ngau Tau Kok",
                "traditional": "牛頭角",
                "simplified": "牛头角",
                "jyutping": "ngau tau gok",
                "pinyin": "niu tou jiao",
                "lat": 22.315542727320494,
                "lon": 114.21892979021685,
            },
            {
                "english": "Kwun Tong",
                "traditional": "觀塘",
                "simplified": "观塘",
                "jyutping": "gwaan tong",
                "pinyin": "guan tang",
                "lat": 22.31223517655273,
                "lon": 114.22634033596339,
            },
            {
                "english": "Lam Tin",
                "traditional": "藍田",
                "simplified": "蓝田",
                "jyutping": "laam tin",
                "pinyin": "lan tian",
                "lat": 22.306843517521354,
                "lon": 114.23267843331601,
            },
            {
                "english": "Yau Tong",
                "traditional": "油塘",
                "simplified": "油塘",
                "jyutping": "jau tong",
                "pinyin": "you tang",
                "lat": 22.298131226582548,
                "lon": 114.2369492281437,
            },
            {
                "english": "Tiu Keng Leng",
                "traditional": "調景嶺",
                "simplified": "调景岭",
                "jyutping": "tiu geng leng",
                "pinyin": "diao jing ling",
                "lat": 22.304498790816805,
                "lon": 114.25289048797987,
            },
        ],
    },
    {
        "code": "TWL",
        "name": "Tsuen Wan Line",
        "color": "#ED1D24",
        "stations": [
            {
                "english": "Tsuen Wan",
                "traditional": "荃灣",
                "simplified": "荃湾",
                "jyutping": "cyun waan",
                "pinyin": "quan wan",
                "lat": 22.373734009426936,
                "lon": 114.11767553835726,
            },
            {
                "english": "Tai Wo Hau",
                "traditional": "大窩口",
                "simplified": "大窝口",
                "jyutping": "daai wo hau",
                "pinyin": "da wo kou",
                "lat": 22.370797859951935,
                "lon": 114.12502581883881,
            },
            {
                "english": "Kwai Hing",
                "traditional": "葵興",
                "simplified": "葵兴",
                "jyutping": "kwai hing",
                "pinyin": "kui xing",
                "lat": 22.363070330730373,
                "lon": 114.13118944600042,
            },
            {
                "english": "Kwai Fong",
                "traditional": "葵芳",
                "simplified": "葵芳",
                "jyutping": "kwai fong",
                "pinyin": "kui fang",
                "lat": 22.356850046965256,
                "lon": 114.12772154175781,
            },
            {
                "english": "Lai King",
                "traditional": "荔景",
                "simplified": "荔景",
                "jyutping": "lai ging",
                "pinyin": "li jing",
                "lat": 22.34845562951537,
                "lon": 114.12611713173048,
            },
            {
                "english": "Mei Foo",
                "traditional": "美孚",
                "simplified": "美孚",
                "jyutping": "mei fu",
                "pinyin": "mei fu",
                "lat": 22.33778438348702,
                "lon": 114.13640810965138,
            },
            {
                "english": "Lai Chi Kok",
                "traditional": "荔枝角",
                "simplified": "荔枝角",
                "jyutping": "lai zi gok",
                "pinyin": "li zhi jiao",
                "lat": 22.337263836090475,
                "lon": 114.14797797706407,
            },
            {
                "english": "Cheung Sha Wan",
                "traditional": "長沙灣",
                "simplified": "长沙湾",
                "jyutping": "coeng saa waan",
                "pinyin": "chang sha wan",
                "lat": 22.335663622415126,
                "lon": 114.15590182994366,
            },
            {
                "english": "Sham Shui Po",
                "traditional": "深水埗",
                "simplified": "深水埗",
                "jyutping": "sam seoi bou",
                "pinyin": "shen shui bu",
                "lat": 22.330779244450383,
                "lon": 114.162251166497,
            },
            {
                "english": "Prince Edward",
                "traditional": "太子",
                "simplified": "太子",
                "jyutping": "taai zi",
                "pinyin": "tai zi",
                "lat": 22.325073609415977,
                "lon": 114.1683590387622,
            },
            {
                "english": "Mong Kok",
                "traditional": "旺角",
                "simplified": "旺角",
                "jyutping": "wong gok",
                "pinyin": "wang jiao",
                "lat": 22.319269393084312,
                "lon": 114.16932094752586,
            },
            {
                "english": "Yau Ma Tei",
                "traditional": "油麻地",
                "simplified": "油麻地",
                "jyutping": "jau maa dei",
                "pinyin": "you ma di",
                "lat": 22.31287598860284,
                "lon": 114.17060538622357,
            },
            {
                "english": "Jordan",
                "traditional": "佐敦",
                "simplified": "佐敦",
                "jyutping": "zo deon",
                "pinyin": "zuo dun",
                "lat": 22.304813212563253,
                "lon": 114.17165370511839,
            },
            {
                "english": "Tsim Sha Tsui",
                "traditional": "尖沙咀",
                "simplified": "尖沙咀",
                "jyutping": "zim saa zeoi",
                "pinyin": "jian sha zui",
                "lat": 22.29757487179842,
                "lon": 114.17220829349618,
            },
            {
                "english": "Admiralty",
                "traditional": "金鐘",
                "simplified": "金钟",
                "jyutping": "gam zung",
                "pinyin": "jin zhong",
                "lat": 22.279451691190783,
                "lon": 114.16450623067786,
            },
            {
                "english": "Central",
                "traditional": "中環",
                "simplified": "中环",
                "jyutping": "zung waan",
                "pinyin": "zhong huan",
                "lat": 22.281959995075137,
                "lon": 114.1582387894817,
            },
        ],
    },
    {
        "code": "ISL",
        "name": "Island Line",
        "color": "#007DC5",
        "stations": [
            {
                "english": "Kennedy Town",
                "traditional": "堅尼地城",
                "simplified": "坚尼地城",
                "jyutping": "gin nei dei sing",
                "pinyin": "jian ni di cheng",
                "lat": 22.281230032959137,
                "lon": 114.12885326025452,
            },
            {
                "english": "HKU",
                "traditional": "香港大學",
                "simplified": "香港大学",
                "jyutping": "hoeng gong daai hok",
                "pinyin": "xiang gang da xue",
                "aliases": ["Hong Kong University"],
                "lat": 22.284011899390542,
                "lon": 114.13500113640396,
            },
            {
                "english": "Sai Ying Pun",
                "traditional": "西營盤",
                "simplified": "西营盘",
                "jyutping": "sai jing pun",
                "pinyin": "xi ying pan",
                "lat": 22.285549203477114,
                "lon": 114.14265285358357,
            },
            {
                "english": "Sheung Wan",
                "traditional": "上環",
                "simplified": "上环",
                "jyutping": "soeng waan",
                "pinyin": "shang huan",
                "lat": 22.286599310711583,
                "lon": 114.15180216340886,
            },
            {
                "english": "Central",
                "traditional": "中環",
                "simplified": "中环",
                "jyutping": "zung waan",
                "pinyin": "zhong huan",
                "lat": 22.281959995075137,
                "lon": 114.1582387894817,
            },
            {
                "english": "Admiralty",
                "traditional": "金鐘",
                "simplified": "金钟",
                "jyutping": "gam zung",
                "pinyin": "jin zhong",
                "lat": 22.279451691190783,
                "lon": 114.16450623067786,
            },
            {
                "english": "Wan Chai",
                "traditional": "灣仔",
                "simplified": "湾仔",
                "jyutping": "waan zai",
                "pinyin": "wan zai",
                "lat": 22.27760085118929,
                "lon": 114.17313164026983,
            },
            {
                "english": "Causeway Bay",
                "traditional": "銅鑼灣",
                "simplified": "铜锣湾",
                "jyutping": "tung lo waan",
                "pinyin": "tong luo wan",
                "lat": 22.28038327237469,
                "lon": 114.18501872340813,
            },
            {
                "english": "Tin Hau",
                "traditional": "天后",
                "simplified": "天后",
                "jyutping": "tin hau",
                "pinyin": "tian hou",
                "lat": 22.28242942413933,
                "lon": 114.19169936614944,
            },
            {
                "english": "Fortress Hill",
                "traditional": "炮台山",
                "simplified": "炮台山",
                "jyutping": "paau toi saan",
                "pinyin": "pao tai shan",
                "lat": 22.288039878751476,
                "lon": 114.19349443868474,
            },
            {
                "english": "North Point",
                "traditional": "北角",
                "simplified": "北角",
                "jyutping": "bak gok",
                "pinyin": "bei jiao",
                "lat": 22.291298432962915,
                "lon": 114.20044416999906,
            },
            {
                "english": "Quarry Bay",
                "traditional": "鰂魚涌",
                "simplified": "鲗鱼涌",
                "jyutping": "zaap jyu cung",
                "pinyin": "zei yu chong",
                "lat": 22.287910006713926,
                "lon": 114.20974558114817,
            },
            {
                "english": "Tai Koo",
                "traditional": "太古",
                "simplified": "太古",
                "jyutping": "taai gu",
                "pinyin": "tai gu",
                "lat": 22.28470554858333,
                "lon": 114.21633260715609,
            },
            {
                "english": "Sai Wan Ho",
                "traditional": "西灣河",
                "simplified": "西湾河",
                "jyutping": "sai waan ho",
                "pinyin": "xi wan he",
                "lat": 22.282085622995023,
                "lon": 114.22192515638986,
            },
            {
                "english": "Shau Kei Wan",
                "traditional": "筲箕灣",
                "simplified": "筲箕湾",
                "jyutping": "saau gei waan",
                "pinyin": "shao ji wan",
                "lat": 22.279281602598168,
                "lon": 114.22888658531598,
            },
            {
                "english": "Heng Fa Chuen",
                "traditional": "杏花邨",
                "simplified": "杏花邨",
                "jyutping": "hang faa cyun",
                "pinyin": "xing hua cun",
                "lat": 22.276813148960652,
                "lon": 114.23987276387923,
            },
            {
                "english": "Chai Wan",
                "traditional": "柴灣",
                "simplified": "柴湾",
                "jyutping": "caai waan",
                "pinyin": "chai wan",
                "lat": 22.26461679088369,
                "lon": 114.23711372198562,
            },
        ],
    },
    {
        "code": "TKL",
        "name": "Tseung Kwan O Line",
        "color": "#7D499D",
        "stations": [
            {
                "english": "North Point",
                "traditional": "北角",
                "simplified": "北角",
                "jyutping": "bak gok",
                "pinyin": "bei jiao",
                "lat": 22.291298432962915,
                "lon": 114.20044416999906,
            },
            {
                "english": "Quarry Bay",
                "traditional": "鰂魚涌",
                "simplified": "鲗鱼涌",
                "jyutping": "zaap jyu cung",
                "pinyin": "zei yu chong",
                "lat": 22.287910006713926,
                "lon": 114.20974558114817,
            },
            {
                "english": "Yau Tong",
                "traditional": "油塘",
                "simplified": "油塘",
                "jyutping": "jau tong",
                "pinyin": "you tang",
                "lat": 22.298131226582548,
                "lon": 114.2369492281437,
            },
            {
                "english": "Tiu Keng Leng",
                "traditional": "調景嶺",
                "simplified": "调景岭",
                "jyutping": "tiu geng leng",
                "pinyin": "diao jing ling",
                "lat": 22.304498790816805,
                "lon": 114.25289048797987,
            },
            {
                "english": "Tseung Kwan O",
                "traditional": "將軍澳",
                "simplified": "将军澳",
                "jyutping": "zoeng gwan ou",
                "pinyin": "jiang jun ao",
                "lat": 22.307514854135597,
                "lon": 114.2600783195476,
            },
            {
                "english": "Hang Hau",
                "traditional": "坑口",
                "simplified": "坑口",
                "jyutping": "haang hau",
                "pinyin": "keng kou",
                "lat": 22.31557654069371,
                "lon": 114.264327356923,
            },
            {
                "english": "Po Lam",
                "traditional": "寶琳",
                "simplified": "宝琳",
                "jyutping": "bou lam",
                "pinyin": "bao lin",
                "lat": 22.322510476624217,
                "lon": 114.25783336734466,
            },
            {
                "english": "LOHAS Park",
                "traditional": "康城",
                "simplified": "康城",
                "jyutping": "hong sing",
                "pinyin": "kang cheng",
                "lat": 22.296363961613412,
                "lon": 114.26960117408298,
            },
        ],
        "segments": [
            [
                "North Point",
                "Quarry Bay",
                "Yau Tong",
                "Tiu Keng Leng",
                "Tseung Kwan O",
                "Hang Hau",
                "Po Lam",
            ],
            ["Tseung Kwan O", "LOHAS Park"],
        ],
    },
    {
        "code": "SIL",
        "name": "South Island Line",
        "color": "#BAC429",
        "stations": [
            {
                "english": "Admiralty",
                "traditional": "金鐘",
                "simplified": "金钟",
                "jyutping": "gam zung",
                "pinyin": "jin zhong",
                "lat": 22.279451691190783,
                "lon": 114.16450623067786,
            },
            {
                "english": "Ocean Park",
                "traditional": "海洋公園",
                "simplified": "海洋公园",
                "jyutping": "hoi joeng gung jyun",
                "pinyin": "hai yang gong yuan",
                "lat": 22.24872671920398,
                "lon": 114.1743805735968,
            },
            {
                "english": "Wong Chuk Hang",
                "traditional": "黃竹坑",
                "simplified": "黄竹坑",
                "jyutping": "wong zuk haang",
                "pinyin": "huang zhu keng",
                "lat": 22.24800532433389,
                "lon": 114.16800016186689,
            },
            {
                "english": "Lei Tung",
                "traditional": "利東",
                "simplified": "利东",
                "jyutping": "lei dung",
                "pinyin": "li dong",
                "lat": 22.24194942467918,
                "lon": 114.15610732349629,
            },
            {
                "english": "South Horizons",
                "traditional": "海怡半島",
                "simplified": "海怡半岛",
                "jyutping": "hoi ji bun dou",
                "pinyin": "hai yi ban dao",
                "lat": 22.242868288477673,
                "lon": 114.14868639554415,
            },
        ],
    },
    {
        "code": "XRL",
        "name": "Express Rail Link",
        "color": "#BBB0A3",
        "stations": [
            {
                "english": "Hong Kong West Kowloon",
                "traditional": "香港西九龍",
                "simplified": "香港西九龙",
                "jyutping": "hoeng gong sai gau lung",
                "pinyin": "xiang gang xi jiu long",
                "aliases": ["West Kowloon", "West Kowloon Station"],
                "lat": 22.304326729979785,
                "lon": 114.16464643004569,
            },
        ],
    },
]

output_dir = Path(__file__).resolve().parent
output_dir.mkdir(parents=True, exist_ok=True)

def hex_to_rgb(hex_color: str):
    hex_color = hex_color.lstrip("#")
    if len(hex_color) == 3:
        hex_color = "".join([c * 2 for c in hex_color])
    return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))


def rgb_to_hex(rgb):
    return "#{:02X}{:02X}{:02X}".format(*rgb)


def darken(hex_color: str, factor: float = 0.6) -> str:
    r, g, b = hex_to_rgb(hex_color)
    darkened = tuple(max(0, min(255, int(c * factor))) for c in (r, g, b))
    return rgb_to_hex(darkened)


def relative_luminance(hex_color: str) -> float:
    def channel_lum(c: int) -> float:
        c = c / 255.0
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = hex_to_rgb(hex_color)
    return 0.2126 * channel_lum(r) + 0.7152 * channel_lum(g) + 0.0722 * channel_lum(b)


def pick_text_color(hex_color: str) -> str:
    return "#000000" if relative_luminance(hex_color) > 0.5 else "#FFFFFF"


def build_alternate_names(station: dict) -> list[str]:
    alt = set()
    traditional = station.get("traditional")
    simplified = station.get("simplified")
    english = station.get("english")
    jyutping = station.get("jyutping")
    pinyin = station.get("pinyin")
    aliases = station.get("aliases", [])

    for name in [traditional, simplified]:
        if name:
            alt.add(name)
            alt.add(f"{name}站")

    if english:
        alt.add(english)
        alt.add(english.lower())
        alt.add(english.replace(" ", ""))
        alt.add(english.replace(" ", "-"))
        alt.add(f"{english} Station")
        alt.add(f"{english.lower()} station")

    for roman in [jyutping, pinyin]:
        if not roman:
            continue
        alt.add(roman)
        alt.add(roman.replace(" ", ""))
        alt.add(roman.replace(" ", "-"))

    for alias in aliases:
        if not alias:
            continue
        alt.add(alias)
        alt.add(alias.lower())

    return sorted({name.strip() for name in alt if name and name.strip()})


features = []
stations_per_line: dict[str, int] = {}
routes = []
lines_meta: dict[str, dict] = {}

feature_id = 0

for order, line in enumerate(lines):
    line_code = line["code"]
    line_color = line["color"]
    lines_meta[line_code] = {
        "name": f'{line["name"]} ({line_code})',
        "color": line_color,
        "backgroundColor": darken(line_color, 0.55),
        "textColor": pick_text_color(line_color),
        "order": order,
    }

    stations = line.get("stations", [])
    stations_per_line[line_code] = len(stations)

    coordinates = []
    station_lookup: dict[str, list[float]] = {}

    for index, station in enumerate(stations):
        feature_id += 1
        coordinates.append([station["lon"], station["lat"]])
        station_lookup[station["english"]] = [station["lon"], station["lat"]]

        traditional = station["traditional"]
        english = station["english"]
        name = f'{english} ({traditional})'
        long_name = f'{traditional} {english}'
        alternate_names = build_alternate_names(station)

        features.append(
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [station["lon"], station["lat"]],
                },
                "properties": {
                    "id": feature_id,
                    "name": name,
                    "long_name": long_name,
                    "alternate_names": alternate_names,
                    "line": line_code,
                    "order": index,
                },
                "id": feature_id,
            }
        )

    segments = line.get("segments")
    if segments:
        for segment in segments:
            segment_coords = []
            for station_name in segment:
                coords = station_lookup.get(station_name)
                if not coords:
                    raise ValueError(
                        f"Segment for line {line_code} references unknown station '{station_name}'"
                    )
                segment_coords.append(coords)
            if len(segment_coords) >= 2:
                routes.append(
                    {
                        "type": "Feature",
                        "geometry": {
                            "type": "LineString",
                            "coordinates": segment_coords,
                        },
                        "properties": {
                            "line": line_code,
                            "name": line_code,
                            "color": line_color,
                            "order": order,
                        },
                    }
                )
    elif len(coordinates) >= 2:
        routes.append(
            {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": coordinates,
                },
                "properties": {
                    "line": line_code,
                    "name": line_code,
                    "color": line_color,
                    "order": order,
                },
            }
        )

features_collection = {
    "type": "FeatureCollection",
    "features": features,
    "properties": {
        "totalStations": len(features),
        "stationsPerLine": stations_per_line,
    },
}

routes_collection = {
    "type": "FeatureCollection",
    "features": routes,
}

(output_dir / "features.json").write_text(
    json.dumps(features_collection, ensure_ascii=False, indent=2), encoding="utf-8"
)
(output_dir / "routes.json").write_text(
    json.dumps(routes_collection, ensure_ascii=False, indent=2), encoding="utf-8"
)
(output_dir / "lines.json").write_text(
    json.dumps(lines_meta, ensure_ascii=False, indent=2), encoding="utf-8"
)

print(
    f"Wrote {len(features)} stations across {len(lines)} lines to {output_dir.relative_to(Path.cwd())}"
)

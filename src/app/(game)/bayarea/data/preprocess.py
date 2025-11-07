import json
from pathlib import Path
from typing import Dict, List, Optional

BASE_DIR = Path(__file__).resolve().parent
MASTER_PATH = BASE_DIR.parent / 'smart+bart+muni+caltrain+vta.geojson'
BART_PATH = BASE_DIR.parent / 'BART_Stations_2025.geojson'
VTA_PATH = BASE_DIR.parent / 'VTA LR stations.geojson'
SACRT_PATH = BASE_DIR.parent / 'SacRTStops_Rail_Centroid_0402.geojson'

MANUAL_COORDS = {
    'Santa Clara - Great America': (-121.96703631711618, 37.406930330948676),
    'Great America ACE': (-121.96703631711618, 37.406930330948676),
    'Pleasanton ACE': (-121.88250824137218, 37.65823788187713),
    'Livermore ACE': (-121.76699806273707, 37.68533360032483),
    'Vasco Road ACE': (-121.71787321520581, 37.69700689431936),
    'Tracy ACE': (-121.43442866825451, 37.69623895238268),
    'Lathrop/Manteca ACE': (-121.2634939067389, 37.798102061685),
    'Manteca Transit Center': (-121.21596360100314, 37.794848471756495),
    'Ripon ACE': (-121.12124666361078, 37.73872183528531),
    'Modesto ACE': (-121.00198859344277, 37.6393713663799),
    'Ceres ACE': (-120.9570349776886, 37.59114578611956),
    'Turlock ACE': (-120.85990763857265, 37.505878399940045),
    'Livingston ACE': (-120.72270977362878, 37.38707616285738),
    'Merced ACE': (-120.49109939514858, 37.302291126774264),
    'Elk Grove ACE': (-121.45666861266514, 38.42615622256755),
    'City College ACE': (-121.48499345847583, 38.54193602149673),
    'Midtown Sacramento ACE': (-121.48377735732231, 38.56909766146392),
    'Old North Sacramento ACE': (-121.46863964410899, 38.604003921790685),
    'Natomas/Sacramento Airport ACE': (-121.47990239319498, 38.6847052038046),
    'Robert J. Cabral - Stockton': (-121.2787619528601, 37.95729486137031),
    'Lodi ACE': (-121.35833758271234, 38.11668877649242),
    'Healdsburg SMART': (-122.86557543461626, 38.60688548299941),
    'Cloverdale SMART': (-123.01202891029962, 38.798515052019795),
    'Stanford Station': (-122.1611, 37.4342),
    'Chinatown – Rose Pak Station': (-122.406666, 37.795001),
    'Union Square / Market Street Station': (-122.407629, 37.787921),
    'Yerba Buena/Moscone Station': (-122.404038, 37.783363),
    '4th St & Brannan St': (-122.397295, 37.776392),
}

ORDINAL_ONES = {
    0: '',
    1: 'first',
    2: 'second',
    3: 'third',
    4: 'fourth',
    5: 'fifth',
    6: 'sixth',
    7: 'seventh',
    8: 'eighth',
    9: 'ninth',
}
ORDINAL_TEENS = {
    10: 'tenth',
    11: 'eleventh',
    12: 'twelfth',
    13: 'thirteenth',
    14: 'fourteenth',
    15: 'fifteenth',
    16: 'sixteenth',
    17: 'seventeenth',
    18: 'eighteenth',
    19: 'nineteenth',
}
ORDINAL_TENS = {
    20: 'twentieth',
    30: 'thirtieth',
    40: 'fortieth',
    50: 'fiftieth',
    60: 'sixtieth',
    70: 'seventieth',
    80: 'eightieth',
    90: 'ninetieth',
}
TENS_WORD = {
    20: 'twenty',
    30: 'thirty',
    40: 'forty',
    50: 'fifty',
    60: 'sixty',
    70: 'seventy',
    80: 'eighty',
    90: 'ninety',
}


def number_to_ordinal_word(n: int) -> Optional[str]:
    if n <= 0:
        return None
    if n < 10:
        return ORDINAL_ONES[n]
    if 10 <= n < 20:
        return ORDINAL_TEENS[n]
    if n in ORDINAL_TENS:
        return ORDINAL_TENS[n]
    tens, ones = divmod(n, 10)
    tens_value = tens * 10
    if tens_value not in TENS_WORD or ones not in ORDINAL_ONES:
        return None
    base = TENS_WORD[tens_value]
    return base + ORDINAL_ONES[ones]


def normalize_token(token: str) -> str:
    token = token.lower()
    if token.endswith('.'):
        token = token[:-1]
    if len(token) > 2 and token[-2:] in {'st', 'nd', 'rd', 'th'} and token[:-2].isdigit():
        num = int(token[:-2])
        word = number_to_ordinal_word(num)
        if word:
            return word
    return token


def tokenize(name: str) -> set[str]:
    replacements = ['/', '&', '|', '–', '—', '-', '·', '│', '\u2013', '\u2014', '\u2212', '‒', '−']
    lower = name.lower()
    for ch in replacements:
        lower = lower.replace(ch, ' ')
    lower = lower.replace("'", ' ')
    tokens = []
    for raw_token in lower.split():
        clean = ''.join(ch for ch in raw_token if ch.isalnum())
        if not clean:
            continue
        tokens.append(normalize_token(clean))
    return set(tokens)


class StationIndex:
    def __init__(self) -> None:
        self.features: List[dict] = []

    def add(self, name: str, coord, agency: str) -> None:
        if not name or coord is None or len(coord) != 2:
            return
        lon, lat = coord
        if lon is None or lat is None:
            return
        tokens = tokenize(name)
        if not tokens:
            return
        self.features.append(
            {
                'name': name,
                'coord': [float(lon), float(lat)],
                'agency': agency,
                'tokens': tokens,
            }
        )

    def find(self, query: str, agencies: Optional[List[str]] = None):
        tokens = tokenize(query)
        if not tokens:
            return None
        candidates = [feat for feat in self.features if tokens.issubset(feat['tokens'])]
        if agencies:
            preferred = [feat for feat in candidates if feat['agency'] in agencies]
            if preferred:
                candidates = preferred
        if not candidates:
            return None
        candidates.sort(key=lambda feat: (len(feat['tokens']) - len(tokens), feat['name']))
        return candidates[0]


def load_index() -> StationIndex:
    index = StationIndex()

    with MASTER_PATH.open() as f:
        master = json.load(f)
    for feat in master['features']:
        props = feat['properties']
        name = props.get('station_na') or props.get('ts_locatio')
        if not name:
            continue
        coord = feat['geometry']['coordinates']
        index.add(name, coord, props.get('agencyname') or props.get('mode_') or 'Unknown')

    with BART_PATH.open() as f:
        bart = json.load(f)
    for feat in bart['features']:
        props = feat['properties']
        name = props.get('Name2') or props.get('Name')
        coord = feat['geometry']['coordinates']
        index.add(name, coord, 'BART')

    with VTA_PATH.open() as f:
        vta = json.load(f)
    for feat in vta['features']:
        props = feat['properties']
        lon = props.get('LONG_')
        lat = props.get('LAT')
        if lon is None or lat is None:
            continue
        station = props.get('STA_NAME')
        coord = [lon, lat]
        if station:
            index.add(f'{station} Station', coord, 'Santa Clara VTA')
            index.add(station, coord, 'Santa Clara VTA')

    with SACRT_PATH.open() as f:
        sacrt = json.load(f)
    for feat in sacrt['features']:
        props = feat['properties']
        geom = feat.get('geometry')
        if geom and geom.get('coordinates'):
            coord = geom['coordinates']
        else:
            lon = props.get('LONG_AVG') or props.get('LONG_WB_NB') or props.get('LONG_EB_SB')
            lat = props.get('LAT_AVG') or props.get('LAT_WB_SB') or props.get('LAT_EB_SB')
            coord = [lon, lat]
        name = props.get('STOP_NAM_1')
        if name:
            pretty = name.title()
            index.add(pretty, coord, 'SacRT')
            if not pretty.endswith('Station'):
                index.add(pretty + ' Station', coord, 'SacRT')

    for name, (lon, lat) in MANUAL_COORDS.items():
        index.add(name, (lon, lat), 'Manual')

    return index


def stop(name: str, match: Optional[str] = None, agencies: Optional[List[str]] = None, alternate: Optional[List[str]] = None) -> Dict:
    return {
        'name': name,
        'match': match or name,
        'agencies': agencies,
        'alternate_names': alternate or [],
    }


# Line definitions will be populated below...
LINES: Dict[str, Dict] = {
    # Bay Area Rapid Transit (BART)
    'BARTRed': {
        'agency': ['BART'],
        'stops': [
            stop('Richmond'),
            stop('El Cerrito del Norte'),
            stop('El Cerrito Plaza'),
            stop('North Berkeley'),
            stop('Downtown Berkeley'),
            stop('Ashby'),
            stop('MacArthur'),
            stop('19th St/Oakland'),
            stop('12th St/Oakland City Center'),
            stop('West Oakland'),
            stop('Embarcadero'),
            stop('Montgomery St'),
            stop('Powell St'),
            stop('Civic Center/UN Plaza'),
            stop('16th St/Mission'),
            stop('24th St/Mission'),
            stop('Glen Park'),
            stop('Balboa Park'),
            stop('Daly City'),
            stop('Colma'),
            stop('South San Francisco'),
            stop('San Bruno'),
            stop('San Francisco International Airport (SFO)', match='San Francisco International Airport'),
            stop('Millbrae'),
        ],
    },
    'BARTGreen': {
        'agency': ['BART'],
        'stops': [
            stop('Berryessa/North San José', match='Berryessa/North San José'),
            stop('Milpitas'),
            stop('Warm Springs/South Fremont'),
            stop('Fremont'),
            stop('Union City'),
            stop('South Hayward'),
            stop('Hayward'),
            stop('Bay Fair'),
            stop('San Leandro'),
            stop('Coliseum'),
            stop('Fruitvale'),
            stop('Lake Merritt'),
            stop('West Oakland'),
            stop('Embarcadero'),
            stop('Montgomery St'),
            stop('Powell St'),
            stop('Civic Center/UN Plaza'),
            stop('16th St/Mission'),
            stop('24th St/Mission'),
            stop('Glen Park'),
            stop('Balboa Park'),
            stop('Daly City'),
        ],
    },
    'BARTOrange': {
        'agency': ['BART'],
        'stops': [
            stop('Berryessa/North San José'),
            stop('Milpitas'),
            stop('Warm Springs/South Fremont'),
            stop('Fremont'),
            stop('Union City'),
            stop('South Hayward'),
            stop('Hayward'),
            stop('Bay Fair'),
            stop('San Leandro'),
            stop('Coliseum'),
            stop('Fruitvale'),
            stop('Lake Merritt'),
            stop('12th St/Oakland City Center'),
            stop('19th St/Oakland'),
            stop('MacArthur'),
            stop('Ashby'),
            stop('Downtown Berkeley'),
            stop('North Berkeley'),
            stop('El Cerrito Plaza'),
            stop('El Cerrito del Norte'),
            stop('Richmond'),
        ],
    },
    'BARTYellow': {
        'agency': ['BART'],
        'stops': [
            stop('Antioch'),
            stop('Pittsburg Center'),
            stop('Pittsburg/Bay Point'),
            stop('North Concord/Martinez'),
            stop('Concord'),
            stop('Pleasant Hill/Contra Costa Centre'),
            stop('Walnut Creek'),
            stop('Lafayette'),
            stop('Orinda'),
            stop('Rockridge'),
            stop('MacArthur'),
            stop('19th St/Oakland'),
            stop('12th St/Oakland City Center'),
            stop('West Oakland'),
            stop('Embarcadero'),
            stop('Montgomery St'),
            stop('Powell St'),
            stop('Civic Center/UN Plaza'),
            stop('16th St/Mission'),
            stop('24th St/Mission'),
            stop('Glen Park'),
            stop('Balboa Park'),
            stop('Daly City'),
            stop('Colma'),
            stop('South San Francisco'),
            stop('San Bruno'),
            stop('San Francisco International Airport (SFO)', match='San Francisco International Airport'),
            stop('Millbrae'),
        ],
    },
    'BARTBlue': {
        'agency': ['BART'],
        'stops': [
            stop('Dublin/Pleasanton'),
            stop('West Dublin/Pleasanton'),
            stop('Castro Valley'),
            stop('Bay Fair'),
            stop('San Leandro'),
            stop('Coliseum'),
            stop('Fruitvale'),
            stop('Lake Merritt'),
            stop('12th St/Oakland City Center'),
            stop('19th St/Oakland'),
            stop('MacArthur'),
            stop('Downtown Berkeley'),
            stop('North Berkeley'),
            stop('El Cerrito Plaza'),
            stop('El Cerrito del Norte'),
            stop('Richmond'),
        ],
    },
    'BARTOaklandAirport': {
        'agency': ['BART'],
        'stops': [
            stop('Coliseum'),
            stop('Oakland International Airport'),
        ],
    },
}
# Shared Market Street Subway stops
SUBWAY_STOPS = [
    stop('Van Ness Station', match='Metro Van Ness Station'),
    stop('Civic Center Station', match='Metro Civic Center Station'),
    stop('Powell Station', match='Metro Powell Station'),
    stop('Montgomery Station', match='Metro Montgomery Station'),
    stop('Embarcadero Station', match='Metro Embarcadero Station'),
]

LINES.update(
    {
        # MUNI Metro
        'MuniMetroE': {
            'agency': ['San Francisco MUNI'],
            'stops': [
                stop('King St & 4th St'),
                stop('King St & 2nd St'),
                stop('The Embarcadero & Brannan St'),
                stop('The Embarcadero & Harrison St'),
                stop('The Embarcadero/Ferry Building'),
                stop('The Embarcadero & Washington St'),
                stop('The Embarcadero & Broadway'),
                stop('The Embarcadero & Green St'),
                stop('The Embarcadero & Greenwich St'),
                stop('The Embarcadero & Sansome St'),
                stop('The Embarcadero & Bay St'),
                stop('The Embarcadero & Stockton St'),
                stop('Jefferson St & Powell St'),
                stop('Jefferson St & Taylor St'),
                stop('Jones St & Beach St'),
            ],
        },
        'MuniMetroF': {
            'agency': ['San Francisco MUNI'],
            'stops': [
                stop('17th St & Castro St'),
                stop('Market St & Noe St'),
                stop('Market St & Sanchez St'),
                stop('Market St & Church St'),
                stop('Market St & Dolores St'),
                stop('Market St & Guerrero St'),
                stop('Market St & Gough St'),
                stop('Market St & South Van Ness Ave'),
                stop('Market St & 9th St'),
                stop('Market St & 8th St'),
                stop('Market St & 7th St'),
                stop('Market St & 6th St'),
                stop('Market St & 5th St'),
                stop('Market St & 4th St'),
                stop('Market St & 3rd St'),
                stop('Market St & New Montgomery St'),
                stop('Market St & 1st St'),
                stop('Market St & Main St'),
                stop('Don Chee Way & Steuart St', match='Don Chee Way/steuart St'),
                stop('The Embarcadero/Ferry Building'),
                stop('The Embarcadero & Washington St'),
                stop('The Embarcadero & Broadway'),
                stop('The Embarcadero & Green St'),
                stop('The Embarcadero & Greenwich St'),
                stop('The Embarcadero & Sansome St'),
                stop('The Embarcadero & Bay St'),
                stop('The Embarcadero & Stockton St'),
                stop('Jefferson St & Powell St'),
                stop('Jefferson St & Taylor St'),
                stop('Jones St & Beach St'),
            ],
        },
    }
)

LINES['MuniMetroJ'] = {
    'agency': ['San Francisco MUNI'],
    'stops': [
        stop('San Jose Ave & Geneva Ave'),
        stop('San Jose Ave & Ocean Ave'),
        stop('San Jose Ave & Santa Ynez Ave'),
        stop('San Jose Ave & Santa Rosa Ave'),
        stop('San Jose Ave & Glen Park Station', match='San Jose Ave/Glen Park Station'),
        stop('San Jose Ave & Randall St'),
        stop('30th St & Dolores St'),
        stop('Church St & 30th St'),
        stop('Church St & 29th St'),
        stop('Church St & 28th St'),
        stop('Church St & 26th St'),
        stop('Church St & 24th St'),
        stop('Church St & 22nd St'),
        stop('Right Of Way & 21st St', match='Right Of Way/21st St'),
        stop('Right Of Way & Liberty St', match='Right Of Way/Liberty St'),
        stop('Right Of Way & 20th St', match='Right Of Way/20th St'),
        stop('Right Of Way & 18th St', match='Right Of Way/18th St'),
        stop('Church St & 16th St'),
        stop('Church St & Market St'),
        stop('Church St & Duboce Ave'),
    ] + SUBWAY_STOPS,
}

LINES['MuniMetroK'] = {
    'agency': ['San Francisco MUNI'],
    'stops': [
        stop('San Jose Ave & Geneva Ave'),
        stop('Ocean Ave & CCSF Pedestrian Bridge', match='Ocean Ave/Ccsf Pedestrian Bridge'),
        stop('Ocean Ave & Lee St'),
        stop('Ocean Ave & Miramar Ave'),
        stop('Ocean Ave & Dorado Ter'),
        stop('Ocean Ave & Fairfield Way'),
        stop('Ocean Ave & Aptos Ave'),
        stop('Ocean Ave & San Leandro Way'),
        stop('Junipero Serra Blvd & Ocean Ave'),
        stop('West Portal Ave & Sloat Blvd'),
        stop('West Portal Ave & 14th Ave'),
        stop('West Portal Station'),
        stop('Forest Hill Station'),
        stop('Castro Station', match='Metro Castro Station'),
        stop('Church Station', match='Metro Church Station'),
    ] + SUBWAY_STOPS,
}

LINES['MuniMetroL'] = {
    'agency': ['San Francisco MUNI'],
    'stops': [
        stop('Wawona St & 46th Ave'),
        stop('46th Ave & Vicente St'),
        stop('46th Ave & Ulloa St'),
        stop('46th Ave & Taraval St'),
        stop('Taraval St & 44th Ave'),
        stop('Taraval St & 42nd Ave'),
        stop('Taraval St & 40th Ave'),
        stop('Taraval St & Sunset Blvd'),
        stop('Taraval St & 32nd Ave'),
        stop('Taraval St & 30th Ave'),
        stop('Taraval St & 26th Ave'),
        stop('Taraval St & 22nd Ave'),
        stop('Taraval St & 19th Ave'),
        stop('Taraval St & 17th Ave'),
        stop('Ulloa St & 14th Ave'),
        stop('Ulloa St & West Portal Ave'),
        stop('West Portal Station'),
        stop('Forest Hill Station'),
        stop('Castro Station', match='Metro Castro Station'),
        stop('Church Station', match='Metro Church Station'),
    ] + SUBWAY_STOPS,
}

LINES['MuniMetroM'] = {
    'agency': ['San Francisco MUNI'],
    'stops': [
        stop('San Jose Ave & Geneva Ave'),
        stop('San Jose Ave & Lakeview Ave'),
        stop('San Jose Ave & Farallones St'),
        stop('Broad St & Plymouth Ave'),
        stop('Broad St & Capitol Ave'),
        stop('Broad St & Orizaba Ave'),
        stop('Randolph St & Bright St'),
        stop('Randolph St & Arch St'),
        stop('19th Ave & Randolph St'),
        stop('19th Ave & Junipero Serra Blvd'),
        stop('19th Ave & Holloway Ave'),
        stop('19th Ave & Winston Dr'),
        stop('Right Of Way & Eucalyptus Dr', match='Right Of Way/Eucalyptus Dr'),
        stop('Right Of Way & Ocean Ave', match='Right Of Way/Ocean Ave'),
        stop('West Portal Ave & Sloat Blvd'),
        stop('West Portal Ave & 14th Ave'),
        stop('West Portal Station'),
        stop('Forest Hill Station'),
        stop('Castro Station', match='Metro Castro Station'),
        stop('Church Station', match='Metro Church Station'),
    ] + SUBWAY_STOPS,
}

LINES['MuniMetroN'] = {
    'agency': ['San Francisco MUNI'],
    'stops': [
        stop('Judah St & La Playa St'),
        stop('Judah St & 46th Ave'),
        stop('Judah St & 43rd Ave'),
        stop('Judah St & 40th Ave'),
        stop('Judah St & Sunset Blvd'),
        stop('Judah St & 34th Ave'),
        stop('Judah St & 31st Ave'),
        stop('Judah St & 28th Ave'),
        stop('Judah St & 25th Ave'),
        stop('Judah St & 22nd Ave'),
        stop('Judah St & 19th Ave'),
        stop('Judah St & 15th Ave'),
        stop('Judah St & Funston Ave'),
        stop('Judah St & 12th Ave'),
        stop('Judah St & 9th Ave'),
        stop('Irving St & 8th Ave'),
        stop('Irving St & 5th Ave'),
        stop('Irving St & Arguello Blvd'),
        stop('Carl St & Hillway Ave'),
        stop('Carl St & Stanyan St'),
        stop('Carl St & Cole St'),
        stop('Duboce Ave & Noe St'),
        stop('Duboce Ave & Church St'),
    ]
    + SUBWAY_STOPS
    + [
        stop('The Embarcadero & Folsom St'),
        stop('The Embarcadero & Brannan St'),
        stop('King St & 2nd St'),
        stop('King St & 4th St'),
    ],
}

LINES['MuniMetroS'] = {
    'agency': ['San Francisco MUNI'],
    'stops': SUBWAY_STOPS[:-1] + [stop('Castro Station', match='Metro Castro Station')],
}

LINES['MuniMetroT'] = {
    'agency': ['San Francisco MUNI', 'Manual'],
    'stops': [
        stop('Chinatown–Rose Pak Station', match='Chinatown – Rose Pak Station', alternate=['Chinatown', 'Rose Pak']),
        stop('Union Square/Market Street Station', match='Union Square / Market Street Station'),
        stop('Yerba Buena/Moscone Station'),
        stop('4th St & Brannan St', match='4th St & Brannan St'),
        stop('Fourth Street & King Street', match='King St & 4th St'),
        stop('Third St & Mission Rock St', match='Third Street & Mission Rock St'),
        stop('UCSF/Chase Center', match='Third Street & Mission Rock St', alternate=['Chase Center']),
        stop('UCSF Medical Center', match='Third Street & Mariposa St'),
        stop('3rd St & 20th St', match='Third Street & 20th St'),
        stop('3rd St & 23rd St', match='Third Street & 23rd St'),
        stop('3rd St & Marin St', match='Third Street & Marin St'),
        stop('3rd St & Evans Ave', match='Third Street & Evans Ave'),
        stop('3rd St & Hudson/Innes', match='Third Street/Hudson/Innes'),
        stop('3rd St & Kirkwood/La Salle', match='Third Street/Kirkwood/La Salle'),
        stop('3rd St & Oakdale/Palou', match='Third Street/Oakdale/Palou'),
        stop('3rd St & Revere/Shafter', match='Third Street/Revere/Shafter'),
        stop('3rd St & Williams Ave', match='Third Street & Williams Ave'),
        stop('3rd St & Carroll Ave', match='Third Street & Carroll Ave'),
        stop('3rd St & Gilman/Paul', match='Third Street/Gilman/Paul'),
        stop('3rd St & Le Conte Ave', match='Third Street & Le Conte Ave'),
        stop('Bayshore Blvd & Arleta/Blanken', match='Bay Shore Blvd & Arleta Ave'),
        stop('Bayshore Blvd & Sunnydale Ave', match='Bay Shore Blvd & Sunnydale Ave'),
    ],
}
# Powell Street shared segment
POWELL_SHARED = [
    stop('Powell St & Market St'),
    stop('Powell St & Geary Blvd'),
    stop("Powell St & O'Farrell St"),
    stop('Powell St & Post St'),
    stop('Powell St & Sutter St'),
    stop('Powell St & Bush St'),
    stop('Powell St & Pine St'),
    stop('Powell St & California St'),
    stop('Powell St & Sacramento St'),
    stop('Powell St & Clay St'),
    stop('Powell St & Washington St'),
    stop('Powell St & Jackson St'),
]

LINES['MuniCablePowellHyde'] = {
    'agency': ['San Francisco MUNI'],
    'stops': POWELL_SHARED
    + [
        stop('Jackson St & Mason St'),
        stop('Washington St & Mason St'),
        stop('Hyde St & Washington St'),
        stop('Hyde St & Jackson St'),
        stop('Hyde St & Pacific Ave'),
        stop('Hyde St & Broadway'),
        stop('Hyde St & Vallejo St'),
        stop('Hyde St & Union St'),
        stop('Hyde St & Filbert St'),
        stop('Hyde St & Greenwich St'),
        stop('Hyde St & Lombard St'),
        stop('Hyde St & Chestnut St'),
        stop('Hyde St & Bay St'),
        stop('Hyde St & North Point St'),
        stop('Hyde St & Beach St'),
    ],
}

LINES['MuniCablePowellMason'] = {
    'agency': ['San Francisco MUNI'],
    'stops': POWELL_SHARED
    + [
        stop('Jackson St & Mason St'),
        stop('Mason St & Washington St'),
        stop('Mason St & Pacific Ave'),
        stop('Mason St & Broadway'),
        stop('Mason St & Vallejo St'),
        stop('Mason St & Union St'),
        stop('Mason St & Filbert St'),
        stop('Mason St & Greenwich St'),
        stop('Mason St & Green St'),
        stop('Columbus Ave & Lombard St'),
        stop('Columbus Ave & Chestnut St'),
        stop('Taylor St & Bay St'),
    ],
}

LINES['MuniCableCalifornia'] = {
    'agency': ['San Francisco MUNI'],
    'stops': [
        stop('California St & Drumm St'),
        stop('California St & Davis St'),
        stop('California St & Front St'),
        stop('California St & Battery St'),
        stop('California St & Sansome St'),
        stop('California St & Montgomery St'),
        stop('California St & Kearny St'),
        stop('California St & Grant Ave'),
        stop('California St & Stockton St'),
        stop('California St & Powell St'),
        stop('California St & Mason St'),
        stop('California St & Taylor St'),
        stop('California St & Jones St'),
        stop('California St & Leavenworth St'),
        stop('California St & Hyde St'),
        stop('California St & Larkin St'),
        stop('California St & Polk St'),
        stop('California St & Van Ness Ave'),
    ],
}
# VTA Light Rail
LINES['VTAOrange'] = {
    'agency': ['Santa Clara VTA'],
    'stops': [
        stop('Mountain View'),
        stop('Whisman'),
        stop('Middlefield'),
        stop('Bayshore/NASA'),
        stop('Moffett Park'),
        stop('Lockheed Martin'),
        stop('Borregas'),
        stop('Crossman'),
        stop('Fair Oaks'),
        stop('Vienna'),
        stop('Reamwood'),
        stop('Old Ironsides'),
        stop('Great America', match='Great America Station'),
        stop('Lick Mill'),
        stop('Champion'),
        stop('Baypointe'),
        stop('Cisco Way'),
        stop('Alder'),
        stop('Great Mall'),
        stop('Milpitas'),
        stop('Cropley'),
        stop('Hostetter'),
        stop('Berryessa'),
        stop('Penitencia Creek'),
        stop('McKee'),
        stop('Alum Rock'),
    ],
}

LINES['VTABlue'] = {
    'agency': ['Santa Clara VTA'],
    'stops': [
        stop('Baypointe'),
        stop('Tasman'),
        stop('River Oaks'),
        stop('Orchard'),
        stop('Bonaventura'),
        stop('Component'),
        stop('Karina'),
        stop('Metro/Airport'),
        stop('Gish'),
        stop('Civic Center'),
        stop('Japantown/Ayer'),
        stop('St. James', match='Saint James'),
        stop('Santa Clara'),
        stop('Paseo de San Antonio'),
        stop('Convention Center'),
        stop("Children's Discovery Museum"),
        stop('Virginia'),
        stop('Tamien'),
        stop('Curtner'),
        stop('Capitol'),
        stop('Branham'),
        stop('Ohlone/Chynoweth'),
        stop('Blossom Hill'),
        stop('Snell'),
        stop('Cottle'),
        stop('Santa Teresa'),
    ],
}

LINES['VTAGreen'] = {
    'agency': ['Santa Clara VTA'],
    'stops': [
        stop('Old Ironsides'),
        stop('Great America', match='Great America Station'),
        stop('Lick Mill'),
        stop('Champion'),
        stop('Tasman'),
        stop('River Oaks'),
        stop('Orchard'),
        stop('Bonaventura'),
        stop('Component'),
        stop('Karina'),
        stop('Metro/Airport'),
        stop('Gish'),
        stop('Civic Center'),
        stop('Japantown/Ayer'),
        stop('St. James', match='Saint James'),
        stop('Santa Clara'),
        stop('Paseo de San Antonio'),
        stop('Convention Center'),
        stop('San Fernando'),
        stop('San Jose Diridon'),
        stop('Race'),
        stop('Fruitdale'),
        stop('Bascom'),
        stop('Hamilton'),
        stop('Downtown Campbell'),
        stop('Winchester'),
    ],
}
# SMART
LINES['SMARTMain'] = {
    'agency': ['SMART', 'Manual'],
    'stops': [
        stop('Windsor'),
        stop('Sonoma County Airport'),
        stop('Santa Rosa North'),
        stop('Santa Rosa Downtown'),
        stop('Rohnert Park'),
        stop('Cotati'),
        stop('Petaluma North'),
        stop('Petaluma Downtown'),
        stop('Novato San Marin'),
        stop('Novato Downtown'),
        stop('Novato Hamilton'),
        stop('Marin Civic Center'),
        stop('San Rafael'),
        stop('Larkspur'),
        stop('Healdsburg', match='Healdsburg SMART'),
        stop('Cloverdale', match='Cloverdale SMART'),
    ],
}

# ACE
LINES['ACE'] = {
    'agency': ['ACE', 'CALTRAIN', 'Manual'],
    'stops': [
        stop('San Jose Diridon', match='San Jose Station', alternate=['Diridon']),
        stop('Santa Clara', match='Santa Clara Station'),
        stop('Santa Clara - Great America', match='Santa Clara - Great America', alternate=['Great America']),
        stop('Fremont', match='Fremont Station'),
        stop('Pleasanton', match='Pleasanton Station'),
        stop('Livermore', match='Livermore Station'),
        stop('Vasco Road', match='Vasco Road ACE'),
        stop('Tracy', match='Tracy ACE'),
        stop('Lathrop/Manteca', match='Lathrop/Manteca ACE'),
        stop('Manteca Transit Center'),
        stop('Ripon', match='Ripon ACE'),
        stop('Modesto', match='Modesto ACE'),
        stop('Ceres', match='Ceres ACE'),
        stop('Turlock', match='Turlock ACE'),
        stop('Livingston', match='Livingston ACE'),
        stop('Merced', match='Merced ACE'),
        stop('Robert J. Cabral - Stockton', match='Robert J. Cabral - Stockton', alternate=['Stockton', 'Robert J Cabral']),
        stop('Lodi', match='Lodi ACE'),
        stop('Elk Grove', match='Elk Grove ACE'),
        stop('City College', match='City College ACE'),
        stop('Midtown Sacramento', match='Midtown Sacramento ACE'),
        stop('Old North Sacramento', match='Old North Sacramento ACE'),
        stop('Natomas/Sacramento Airport', match='Natomas/Sacramento Airport ACE', alternate=['Sacramento Airport']),
    ],
}
# Caltrain services
LINES['CaltrainLocal'] = {
    'agency': ['CALTRAIN', 'Manual'],
    'stops': [
        stop('San Francisco', match='San Francisco Station'),
        stop('22nd Street', match='22nd St Station'),
        stop('Bayshore', match='Bayshore Station'),
        stop('South San Francisco', match='S San Francisco Station'),
        stop('San Bruno', match='San Bruno Station'),
        stop('Millbrae', match='Millbrae Station'),
        stop('Broadway', match='Broadway Station'),
        stop('Burlingame', match='Burlingame Station'),
        stop('San Mateo', match='San Mateo Station'),
        stop('Hayward Park', match='Hayward Park Station'),
        stop('Hillsdale', match='Hillsdale Station'),
        stop('Belmont', match='Belmont Station'),
        stop('San Carlos', match='San Carlos Station'),
        stop('Redwood City', match='Redwood City Station'),
        stop('Menlo Park', match='Menlo Park Station'),
        stop('Palo Alto', match='Palo Alto Station'),
        stop('Stanford', match='Stanford Station'),
        stop('California Avenue', match='California Ave Station'),
        stop('San Antonio', match='San Antonio Station'),
        stop('Mountain View', match='Mountain View Station'),
        stop('Sunnyvale', match='Sunnyvale Station'),
        stop('Lawrence', match='Lawrence Station'),
        stop('Santa Clara', match='Santa Clara Station'),
        stop('College Park', match='College Park Station'),
        stop('San Jose Diridon', match='San Jose Station'),
        stop('Tamien', match='Tamien Station'),
    ],
}

LINES['CaltrainLimited'] = {
    'agency': ['CALTRAIN'],
    'stops': [
        stop('San Francisco', match='San Francisco Station'),
        stop('22nd Street', match='22nd St Station'),
        stop('South San Francisco', match='S San Francisco Station'),
        stop('Millbrae', match='Millbrae Station'),
        stop('San Mateo', match='San Mateo Station'),
        stop('Hillsdale', match='Hillsdale Station'),
        stop('Redwood City', match='Redwood City Station'),
        stop('Menlo Park', match='Menlo Park Station'),
        stop('Palo Alto', match='Palo Alto Station'),
        stop('California Avenue', match='California Ave Station'),
        stop('San Antonio', match='San Antonio Station'),
        stop('Mountain View', match='Mountain View Station'),
        stop('Sunnyvale', match='Sunnyvale Station'),
        stop('Lawrence', match='Lawrence Station'),
        stop('Santa Clara', match='Santa Clara Station'),
        stop('San Jose Diridon', match='San Jose Station'),
    ],
}

LINES['CaltrainExpress'] = {
    'agency': ['CALTRAIN'],
    'stops': [
        stop('San Francisco', match='San Francisco Station'),
        stop('22nd Street', match='22nd St Station'),
        stop('South San Francisco', match='S San Francisco Station'),
        stop('Millbrae', match='Millbrae Station'),
        stop('San Mateo', match='San Mateo Station'),
        stop('Hillsdale', match='Hillsdale Station'),
        stop('Redwood City', match='Redwood City Station'),
        stop('Palo Alto', match='Palo Alto Station'),
        stop('Mountain View', match='Mountain View Station'),
        stop('Sunnyvale', match='Sunnyvale Station'),
        stop('San Jose Diridon', match='San Jose Station'),
    ],
}

LINES['CaltrainSouthCounty'] = {
    'agency': ['CALTRAIN'],
    'stops': [
        stop('Gilroy', match='Gilroy Station'),
        stop('San Martin', match='San Martin Station'),
        stop('Morgan Hill', match='Morgan Hill Station'),
        stop('Blossom Hill', match='Blossom Hill Station'),
        stop('Capitol', match='Capitol Station'),
        stop('Tamien', match='Tamien Station'),
        stop('San Jose Diridon', match='San Jose Station'),
    ],
}
# SacRT
LINES['SacRTBlue'] = {
    'agency': ['SacRT'],
    'stops': [
        stop('Watt/I-80', match='Watt/I-80 Station'),
        stop('Watt/I-80 West', match='Watt/I-80 West Station'),
        stop('Roseville Road', match='Roseville Road Station'),
        stop('Marconi/Arcade', match='Marconi/Arcade Station'),
        stop('Swanston', match='Swanston Station'),
        stop('Royal Oaks', match='Royal Oaks Station'),
        stop('Arden/Del Paso', match='Arden/Del Paso Station'),
        stop('Globe', match='Globe Avenue Station'),
        stop('Alkali Flat/La Valentina', match='Alkali Flat/La Valentina Station'),
        stop('12th & I', match='12Th & I Station'),
        stop('Cathedral Square', match='Cathedral Square Station'),
        stop('St. Rose of Lima Park', match='St Rose Of Lima Park Station'),
        stop('8th & Capitol', match='8Th & Capitol Station'),
        stop('8th & O', match='8Th & O Station'),
        stop('Archives Plaza', match='Archives Plaza Station'),
        stop('13th Street', match='13Th Street Station'),
        stop('16th Street', match='16Th Street Station'),
        stop('Broadway Station', match='Broadway Station'),
        stop('4th Ave/Wayne Hultgren', match='4Th Ave/Wayne Hultgren Station'),
        stop('City College', match='City College Station'),
        stop('Fruitridge', match='Fruitridge Station'),
        stop('47th Avenue', match='47Th Avenue Station'),
        stop('Florin', match='Florin Station'),
        stop('Meadowview', match='Meadowview Station'),
        stop('Morrison Creek', match='Morrison Creek Station'),
        stop('Franklin', match='Franklin Station'),
        stop('Center Parkway', match='Center Parkway Station'),
        stop('Cosumnes River College', match='Crc Station'),
    ],
}

LINES['SacRTGold'] = {
    'agency': ['SacRT'],
    'stops': [
        stop('Sacramento Valley Station'),
        stop('7th & I/County Center', match='7Th & I/County Center Station'),
        stop('7th & Capitol', match='7Th & Capitol Station'),
        stop('8th & O', match='8Th & O Station'),
        stop('Archives Plaza', match='Archives Plaza Station'),
        stop('13th Street', match='13Th Street Station'),
        stop('16th Street', match='16Th Street Station'),
        stop('23rd Street', match='23Rd Street Station'),
        stop('29th Street', match='29Th Street Station'),
        stop('39th Street', match='39Th Street Station'),
        stop('48th Street', match='48Th Street Station'),
        stop('59th Street', match='59Th Street Station'),
        stop('University/65th Street', match='University/65Th Street Station'),
        stop('Power Inn', match='Power Inn Station'),
        stop('College Greens', match='College Greens Station'),
        stop('Watt/Manlove', match='Watt/Manlove Station'),
        stop('Starfire', match='Starfire Station'),
        stop('Tiber', match='Tiber Station'),
        stop('Butterfield', match='Butterfield Station'),
        stop('Mather Field/Mills', match='Mather Field/Mills Station'),
        stop('Zinfandel', match='Zinfandel Station'),
        stop('Cordova Town Center', match='Cordova Town Center Station'),
        stop('Sunrise', match='Sunrise Station'),
        stop('Hazel', match='Hazel Station'),
        stop('Iron Point', match='Iron Point Station'),
        stop('Glenn/Robert G. Holderness', match='Glenn Station'),
        stop('Historic Folsom', match='Historic Folsom Station'),
    ],
}

LINES['SacRTGreen'] = {
    'agency': ['SacRT'],
    'stops': [
        stop('13th Street', match='13Th Street Station'),
        stop('Archives Plaza', match='Archives Plaza Station'),
        stop('8th & Capitol', match='8Th & Capitol Station'),
        stop('St. Rose of Lima Park', match='St Rose Of Lima Park Station'),
        stop('8th & K', match='8Th & K Station'),
        stop('8th & H', match='8Th & H Station'),
        stop('7th & Richards/Township 9', match='Township 9 Station'),
    ],
}
def build_features(index: StationIndex):
    features = []
    routes = []
    stations_per_line: Dict[str, int] = {}
    missing: List[tuple] = []
    next_id = 1

    for line_id, info in LINES.items():
        agencies = info.get('agency')
        stations_per_line[line_id] = 0
        route_coords = []
        for stop_info in info['stops']:
            name = stop_info['name']
            match_name = stop_info['match']
            alternate = stop_info.get('alternate_names', [])
            found = index.find(match_name, agencies) or index.find(match_name)
            if not found:
                missing.append((line_id, name, match_name))
                continue
            coord = found['coord']
            route_coords.append(coord)
            feature = {
                'type': 'Feature',
                'geometry': {'type': 'Point', 'coordinates': coord},
                'properties': {
                    'id': next_id,
                    'name': name,
                    'line': line_id,
                },
                'id': next_id,
            }
            alts = list(alternate)
            if match_name != name:
                alts.append(match_name)
            if alts:
                feature['properties']['alternate_names'] = sorted(set(alts))
            features.append(feature)
            stations_per_line[line_id] += 1
            next_id += 1
        if len(route_coords) >= 2:
            routes.append(
                {
                    'type': 'Feature',
                    'geometry': {'type': 'LineString', 'coordinates': route_coords},
                    'properties': {'line': line_id},
                }
            )

    return features, routes, stations_per_line, missing


def write_outputs(features, routes, stations_per_line):
    output_dir = BASE_DIR
    output_dir.mkdir(parents=True, exist_ok=True)

    data = {
        'type': 'FeatureCollection',
        'features': features,
        'properties': {
            'totalStations': len(features),
            'stationsPerLine': stations_per_line,
        },
    }
    (output_dir / 'features.json').write_text(json.dumps(data, indent=2))

    route_data = {'type': 'FeatureCollection', 'features': routes}
    (output_dir / 'routes.json').write_text(json.dumps(route_data, indent=2))


def main() -> None:
    index = load_index()
    features, routes, stations_per_line, missing = build_features(index)
    if missing:
        for line_id, name, match_name in missing:
            print(f'MISSING: line={line_id} stop={name} match={match_name}')
        raise SystemExit(f'Unable to locate {len(missing)} stops')
    write_outputs(features, routes, stations_per_line)
    print(f'Wrote {len(features)} stations across {len(stations_per_line)} lines')


if __name__ == '__main__':
    main()

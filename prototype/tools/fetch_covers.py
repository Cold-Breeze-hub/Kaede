#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""下载作品封面到 assets/covers/<id>.jpg

数据源：
  · AniList GraphQL —— 动画 / 漫画 / 轻小说（含小说版封面）
  · Steam CDN      —— 游戏（library_600x900 竖版封面，比例与海报一致）

用法：python tools/fetch_covers.py
已存在的文件默认跳过，加 --force 重新下载。
"""
import io, json, os, sys, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT  = os.path.join(ROOT, 'assets', 'covers')
os.makedirs(OUT, exist_ok=True)

AL_QUERY = """query($s:String,$t:MediaType){
  Media(search:$s,type:$t){ id title{romaji} coverImage{ extraLarge large } }
}"""

# (id, 来源, 参数)  —— anilist: (类型, 检索词) / steam: appid
SOURCES = [
    # ---------- 动漫 ----------
    ('sg',         'anilist', ('ANIME', 'Steins;Gate')),
    ('frieren',    'anilist', ('ANIME', 'Sousou no Frieren')),
    ('aot',        'anilist', ('ANIME', 'Shingeki no Kyojin')),
    ('chainsaw',   'anilist', ('ANIME', 'Chainsaw Man')),
    ('monogatari', 'anilist', ('ANIME', 'Bakemonogatari')),
    ('mushoku',    'anilist', ('ANIME', 'Mushoku Tensei: Isekai Ittara Honki Dasu')),
    ('rezero',     'anilist', ('ANIME', 'Re:Zero kara Hajimeru Isekai Seikatsu')),
    ('kaguya',     'anilist', ('ANIME', 'Kaguya-sama wa Kokurasetai: Tensai-tachi no Renai Zunousen')),
    ('fate_sn',    'anilist', ('ANIME', "Fate/stay night: Heaven's Feel II. lost butterfly")),
    ('kimetsu_a',  'anilist', ('ANIME', 'Kimetsu no Yaiba')),
    ('jujutsu_a',  'anilist', ('ANIME', 'Jujutsu Kaisen')),
    ('spy_a',      'anilist', ('ANIME', 'Spy x Family')),
    ('sao_a',      'anilist', ('ANIME', 'Sword Art Online')),
    ('index_a',    'anilist', ('ANIME', 'Toaru Majutsu no Index')),
    ('jojo_a',     'anilist', ('ANIME', 'JoJo no Kimyou na Bouken (TV)')),
    ('gundam_a',   'anilist', ('ANIME', 'Kidou Senshi Gundam')),
    ('haruhi_a',   'anilist', ('ANIME', 'Suzumiya Haruhi no Yuuutsu')),
    ('eva_a',      'anilist', ('ANIME', 'Neon Genesis Evangelion')),
    ('slime_a',    'anilist', ('ANIME', 'Tensei shitara Slime Datta Ken')),

    # ---------- 游戏 ----------
    ('wb2',        'anilist', ('ANIME', 'White Album 2')),          # 无独立条目时回落到动画版
    ('higurashi',  'steam',   310360),
    ('fgo',        'anilist', ('ANIME', 'Fate/Grand Order: Zettai Majuu Sensen Babylonia')),
    ('p5',         'steam',   1687950),
    ('dangan',     'steam',   413410),
    ('sg0',        'steam',   412830),
    ('elden',      'steam',   1245620),
    ('clannad',    'steam',   324160),
    ('nier',       'steam',   524220),
    ('ff7r',       'steam',   1462040),
    ('p4g',        'steam',   1113000),
    ('p3r',        'steam',   2161700),
    ('sekiro',     'steam',   814380),
    ('octopath',   'steam',   921570),

    # ---------- 漫画 ----------
    ('aot_m',      'anilist', ('MANGA', 'Shingeki no Kyojin')),
    ('chainsaw_m', 'anilist', ('MANGA', 'Chainsaw Man')),
    ('frieren_m',  'anilist', ('MANGA', 'Sousou no Frieren')),
    ('kaguya_m',   'anilist', ('MANGA', 'Kaguya-sama wa Kokurasetai')),
    ('fate_m',     'anilist', ('MANGA', 'Fate/Zero')),
    ('kimetsu',    'anilist', ('MANGA', 'Kimetsu no Yaiba')),
    ('onepiece',   'anilist', ('MANGA', 'One Piece')),
    ('conan',      'anilist', ('MANGA', 'Detective Conan')),
    ('jojo',       'anilist', ('MANGA', 'JoJo no Kimyou na Bouken')),
    ('jujutsu_m',  'anilist', ('MANGA', 'Jujutsu Kaisen')),
    ('spy_m',      'anilist', ('MANGA', 'Spy x Family')),
    ('naruto',     'anilist', ('MANGA', 'Naruto')),
    ('dragonball', 'anilist', ('MANGA', 'Dragon Ball')),
    ('index_m',    'anilist', ('MANGA', 'Toaru Majutsu no Index')),

    # ---------- 轻小说 ----------
    ('monogatari_n', 'anilist', ('MANGA', 'Bakemonogatari')),
    ('rezero_n',     'anilist', ('MANGA', 'Re:Zero kara Hajimeru Isekai Seikatsu')),
    ('mushoku_n',    'anilist', ('MANGA', 'Mushoku Tensei: Isekai Ittara Honki Dasu')),
    ('fate_n',       'anilist', ('MANGA', 'Fate/Zero')),
    ('sg_n',         'anilist', ('MANGA', 'Steins;Gate')),
    ('sao_n',        'anilist', ('MANGA', 'Sword Art Online')),
    ('index_n',      'anilist', ('MANGA', 'Toaru Majutsu no Index')),
    ('haruhi_n',     'anilist', ('MANGA', 'Suzumiya Haruhi no Yuuutsu')),
    ('slime_n',      'anilist', ('MANGA', 'Tensei shitara Slime Datta Ken')),
    ('spice_n',      'anilist', ('MANGA', 'Ookami to Koushinryou')),
    ('overlord_n',   'anilist', ('MANGA', 'Overlord')),
]

UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ACGN-prototype/1.0'

def http(url, data=None, headers=None, timeout=30):
    h = {'User-Agent': UA}
    h.update(headers or {})
    req = urllib.request.Request(url, data=data, headers=h)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

def anilist_cover(kind, term):
    body = json.dumps({'query': AL_QUERY, 'variables': {'s': term, 't': kind}}).encode('utf-8')
    raw = http('https://graphql.anilist.co', body,
               {'Content-Type': 'application/json', 'Accept': 'application/json'})
    js = json.loads(raw.decode('utf-8'))
    media = (js.get('data') or {}).get('Media')
    if not media:
        raise RuntimeError('no match')
    ci = media['coverImage'] or {}
    # 优先 extraLarge（460x650）；只给 large（230x345）时放大到 Hero 里会糊
    return (ci.get('extraLarge') or ci.get('large')), media['title']['romaji']

def steam_cover(appid):
    url = 'https://cdn.cloudflare.steamstatic.com/steam/apps/%s/library_600x900.jpg' % appid
    return url, str(appid)

def steam_search(term):
    """按名字搜 Steam 商店拿 appid —— 不手硬编 appid，避免记错/记成别的游戏。"""
    import urllib.parse
    url = ('https://store.steampowered.com/api/storesearch/?term=%s&cc=us&l=english'
           % urllib.parse.quote(term))
    js = json.loads(http(url).decode('utf-8'))
    items = js.get('items') or []
    if not items:
        raise RuntimeError('steam 无匹配')
    return items[0]['id'], items[0]['name']

def main():
    force = '--force' in sys.argv
    ok, fail = [], []
    for wid, src, arg in SOURCES:
        dst = os.path.join(OUT, wid + '.jpg')
        if os.path.exists(dst) and not force:
            ok.append(wid + '(cached)')
            continue
        try:
            if src == 'anilist':
                url, title = anilist_cover(arg[0], arg[1])
            elif src == 'steamsearch':
                appid, sname = steam_search(arg)
                url, title = steam_cover(appid)
                title = '%s [%s]' % (sname, appid)
            else:
                url, title = steam_cover(arg)
            blob = http(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=40)
            if len(blob) < 3000:
                raise RuntimeError('too small: %d' % len(blob))
            with io.open(dst, 'wb') as f:
                f.write(blob)
            ok.append('%s <- %s (%d KB)' % (wid, title, len(blob) // 1024))
            time.sleep(0.35)
        except Exception as e:
            fail.append('%s: %s' % (wid, e))
    print('OK %d' % len(ok))
    for line in ok:
        print('  ' + line)
    if fail:
        print('FAIL %d' % len(fail))
        for line in fail:
            print('  ' + line)

if __name__ == '__main__':
    main()

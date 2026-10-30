# -*- coding: utf-8 -*-
"""抓二次元专辑封面（iTunes Search API · 日本区）。

为什么用 iTunes 而不是 AniList：AniList 只有动画/漫画封面，它没有音乐专辑；
iTunes 的 artworkUrl100 把 100x100bb 换成 600x600bb 就能拿到 600px 方图，不需要 key。

坑：iTunes 的 search 是模糊匹配，搜「Fate/Zero ドラマCD」会把 LiSA 的
"oath sign - EP" 排第一。所以每张专辑除了检索词，还要给一组
`must` 关键词，只有命中了才认——否则宁可报 FAIL，也不许存错图。

用法：python tools/fetch_music_covers.py [--force]
"""
import json
import os
import sys
import time
import urllib.parse
import urllib.request

UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ACGN-prototype/1.0'
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'covers')

# (id, must 关键词, [检索词候选...])
ALBUMS = [
    ('lisa_oath',        ['oath'],              ['LiSA Oath Sign', 'oath sign LiSA']),
    ('fz_ost',           ['fate'],              ['梶浦由記 Fate/Zero', 'Fate/Zero Original Soundtrack']),
    ('aimer_brave',      ['brave'],             ['Aimer Brave Shine', 'Brave Shine Aimer']),
    ('aot_ost',          ['進撃', 'attack on titan'],
                                                ['進撃の巨人 Season 2 オリジナルサウンドトラック', '澤野弘之 進撃の巨人']),
    ('chainsaw_ost',     ['chainsaw'],          ['Chainsaw Man Original Soundtrack', '牛尾憲輔 チェンソーマン']),
    ('haruhi_ost',       ['ハルヒ'],            ['涼宮ハルヒの完奏', '涼宮ハルヒ コンプリートサウンドトラック']),
    ('eva_ost',          ['25th anniversary', 'neon genesis'],
                                                ['NEON GENESIS EVANGELION SOUNDTRACK 25th ANNIVERSARY BOX', '新世紀エヴァンゲリオン サウンドトラック']),
    ('fripside_railgun', ['railgun'],           ['fripSide only my railgun', 'only my railgun']),
    ('supercell_kimi',   ['知らない物語'],       ['supercell 君の知らない物語', '君の知らない物語']),
    ('kessoku_band',     ['結束'],              ['結束バンド', 'Kessoku Band']),
    ('yoasobi_idol',     ['アイドル'],           ['YOASOBI アイドル', 'アイドル YOASOBI']),
    ('deco_rabbit',      ['rabbit'],            ['DECO*27 ラビットホール', 'Rabbit Hole DECO27']),
    ('hachi_matryoshka', ['official orange'],   ['ハチ Official Orange', 'ハチ マトリョシカ']),
    ('mitchie_freely',   ['freely'],            ['mitchie M FREELY TOMORROW', 'FREELY TOMORROW 初音ミク']),
    ('touhou_utage',     ['utage', '宴'],        ['凋叶棕 宴', '凋叶棕 Utage']),
    ('touhou_tsuki',     ['tsukiyo', '月夜'],    ['Foxtail-Grass Studio Tsukiyogatari', 'Foxtail-Grass Studio']),
    ('touhou_violin',    ['violin'],            ['TAMUSIC 東方妖々夢', 'TOUHOU VIOLIN ROCK AYAKASHI']),
    ('drama_kase',       ['加瀬'],               ['あさがおと加瀬さん オーディオドラマ', 'あさがおと加瀬さん']),
    ('drama_hakuoki',    ['薄桜鬼'],             ['薄桜鬼 ドラマCD 会津隠密帳', '薄桜鬼 ドラマCD']),
    ('drama_yoru',       ['夜に駆ける'],          ['オーディオドラマ 夜に駆ける', '夜に駆ける オーディオドラマ']),
]


def http(url, timeout=25):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def search(term):
    q = urllib.parse.urlencode({
        'term': term, 'entity': 'album', 'country': 'jp',
        'media': 'music', 'limit': 10,
    })
    raw = http('https://itunes.apple.com/search?' + q)
    return json.loads(raw.decode('utf-8', 'ignore')).get('results', [])


def pick(results, must):
    """在结果里找第一个「名称或歌手命中关键词」的专辑。找不到就返回 None。"""
    low = [m.lower() for m in must]
    for it in results:
        blob = ((it.get('collectionName') or '') + ' ' + (it.get('artistName') or '')).lower()
        if any(m in blob for m in low):
            art = (it.get('artworkUrl100') or '').replace('100x100bb', '600x600bb')
            if art:
                return art, it.get('collectionName'), it.get('artistName')
    return None, None, None


def looks_like_image(b):
    return len(b) > 5000 and b[:2] == b'\xff\xd8'


def main():
    force = '--force' in sys.argv
    os.makedirs(OUT, exist_ok=True)
    ok, fail = 0, []
    for wid, must, terms in ALBUMS:
        dst = os.path.join(OUT, wid + '.jpg')
        if os.path.exists(dst) and os.path.getsize(dst) > 5000 and not force:
            print('SKIP %-18s (exists)' % wid)
            ok += 1
            continue
        got = False
        for t in terms:
            try:
                url, name, artist = pick(search(t), must)
            except Exception as e:
                print('  ! %s -> %s' % (t, e))
                continue
            if not url:
                print('  - 未命中关键词：%s' % t)
                continue
            try:
                blob = http(url)
            except Exception as e:
                print('  ! download %s -> %s' % (url, e))
                continue
            if not looks_like_image(blob):
                print('  ! not an image: %s' % url)
                continue
            with open(dst, 'wb') as f:
                f.write(blob)
            print('OK   %-18s %7d B  <- %s / %s' % (wid, len(blob), name[:40], artist[:22]))
            ok += 1
            got = True
            break
        if not got:
            fail.append(wid)
            print('FAIL %-18s 试过：%s' % (wid, ' / '.join(terms)))
        time.sleep(0.3)
    print('\n完成 %d / %d，失败 %d：%s' % (ok, len(ALBUMS), len(fail), ', '.join(fail) or '无'))
    return 0 if not fail else 1


if __name__ == '__main__':
    sys.exit(main())

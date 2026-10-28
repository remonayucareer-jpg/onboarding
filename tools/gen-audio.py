# -*- coding: utf-8 -*-
"""一线课件讲解录音生成器（方案 A：云端现成音色）。

用法：
    python tools/gen-audio.py             # 生成 LINES 里登记的全部台词
    python tools/gen-audio.py fl-01 fl-02 # 只生成指定几条

台词改完直接改下面的 LINES 再跑一次即可（同名覆盖，页面上立刻生效）。
音色 / 语速改 VOICE / RATE。

注意：LINES 的文本必须与 src/config/frontline.config.js 里对应屏的 script 保持一致
（那里是唯一的台账，改稿请两处同步改）。
"""
import asyncio
import sys
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "audio"

VOICE = "zh-CN-XiaoxiaoNeural"  # 温暖女声：成熟、清晰、不甜腻
RATE = "+0%"                     # 正常语速（此参数必须带正负号；嫌慢/嫌快按 5% 一档调）
PITCH = "-2Hz"                   # 音高微降，更沉稳

# 台词：fl-XX 对应 src/config/frontline.config.js 的第 XX 屏；fl-04-N 是屏 4 第 N 步的分步台词；
# fl-intro 是「先做个小测试」测试说明页的讲解（quizIntro.audioSrc）。
# 注意：课程已精简为 10 屏（原「工单已解决」一屏删除），最后一屏「关注两个公众号」沿用
# fl-11 这个文件名（配置 audioSrc 指向 fl-11.mp3），不要为了编号连续去改名。
# 改台词请同步改 frontline.config.js 的 script。
LINES = {
    "fl-01": "客人想要什么，就会打房间里的电话。这个电话，AI 会替咱们接。",
    "fl-02": "AI 在电话里听明白客人要什么，就会自动开出一张工单，直接发到咱们手机上。咱们要干的活儿，全在这张工单上。",
    "fl-03": "手机一响，就是新工单来了。咱们点开这条消息，看看客人要什么。",
    "fl-04": "拿到工单别急着动，先看三样最要紧的：房间号、服务分类、服务项。咱们一个一个来。",
    "fl-04-1": "先看房间号，看清楚送到哪一间。这一单是零零零零号房间。",
    "fl-04-2": "再看服务分类，知道这是哪一类活儿。这一单写的是送物服务，就是要咱们送东西给客人。",
    "fl-04-3": "最后看服务项，要拿什么、拿几件，都写在这儿。这一单要一瓶水，还有一双成人一次性拖鞋。",
    "fl-05": "看完了就点下方的「领取」。点了领取，这一单就归咱们了，咱们就按工单上客人的需求，把这单做完。",
    "fl-06": "去布草间，把东西拿上：这一单是一瓶水，一双成人一次性拖鞋。要是怕记不住，随时打开工单看一眼，照着拿就行。",
    "fl-07": "东西拿好了，就去找房间。这一单是零零零零房。到门口看一眼门牌，对上了再敲门，别走错门。",
    "fl-08": "到了门口敲敲门，把东西递到客人手上。不过到这里还没完哦，咱们还得再回到工单上。",
    "fl-09": "东西送到了，咱们回到手机上。点底下的「解决」，点了它，这一单才算真正做完。",
    "fl-11": "最后一步：把这两个二维码都长按关注一下。左边「华客极联云」，新工单都推到这儿，不关注就收不到。右边「华客微服务」，工单遇到问题就在这儿报障。具体怎么用，上课老师会带着大家讲一遍。",
    "fl-intro": "课件到这里就全部学完了，接下来是几道练习题。不用紧张，答对两题就算通过。都是选择题：对着工单，看清楚题目问的是什么，再点对应的答案就行。准备好了，就点下面的「开始答题」。",
}


async def synth(key: str, text: str) -> None:
    out = OUT_DIR / f"{key}.mp3"
    tts = edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH)
    await tts.save(str(out))
    size_kb = out.stat().st_size / 1024
    print(f"[ok] {out.relative_to(ROOT)}  {size_kb:.0f} KB")


async def main(keys: list) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for key in keys:
        await synth(key, LINES[key])


if __name__ == "__main__":
    args = sys.argv[1:] or list(LINES)
    unknown = [k for k in args if k not in LINES]
    if unknown:
        sys.exit(f"未知条目：{unknown}（请先登记到 LINES）")
    asyncio.run(main(args))

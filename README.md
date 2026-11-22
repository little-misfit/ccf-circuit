# CCF Circuit · 全球会议赛历

在世界地图上浏览 CCF A、B、C 类计算机会议，按开会日期或投稿日期规划全年日程。支持按年份、月份、学科和等级筛选，点击城市可查看同城会议，星标收藏保存在当前浏览器内。

## 时间与数据

会议记录来自 [CCFDDL](https://ccfddl.com/) 的[公开数据集](https://ccfddl.com/conference/allconf.json)。每轮摘要和全文投稿分别展示，倒计时依据原始时区计算，页面统一显示北京时间。会期与地点保留原文。线上、待定或无法可靠定位的地点保留在日程中。

## 本地运行

在项目目录运行以下命令生成数据快照并启动预览。同步脚本使用 Python 3.9 及以上版本的标准库。

```sh
python3 sync_ccf.py --output conferences.js
python3 -m http.server 8000
```

浏览器中打开 http://localhost:8000 。生成快照后，也可以直接双击 index.html 离线使用。

## 更新和发布

GitHub Actions 每日北京时间 10:23 请求更新，也会在 main 分支提交后构建。构建先校验数据，再用 Chrome 测试地图选点、筛选、收藏和投稿日程。通过后将包含完整数据的静态网页发布到 GitHub Pages。下一次构建失败时，线上继续提供上一次成功发布的版本。

地理底图来自 Natural Earth 的 1:110m 陆地数据，经 World Atlas 汇编。城市标点表示举办地，会议官网提供具体地址。CCFDDL 数据的许可见 CCFDDL-LICENSE.txt。

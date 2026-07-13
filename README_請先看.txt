MCI Trainer TW v2｜重新整理版

這個版本是全新專案，不需要覆蓋舊專案。

主要功能：
- 教官建立6位數房間
- 指揮官完整介面
- METHANE／初報
- 救護車派遣
- 消防車數量派遣
- 台電、欣桃瓦斯、外縣市支援
- 現場資源與指揮紀錄
- 一次檢傷官 START逐題導引
- 二次檢傷官 START逐題導引
- 待後送傷患
- 可用救護車
- 醫院收治患者量能
- 目前後送編組
- 後送紀錄
- 戰情中心即時同步

建議重新建立新的GitHub專案：
MCI-Trainer-TW-v2

上傳時，GitHub根目錄應直接看到：
package.json
server.js
render.yaml
public資料夾

Render部署：
1. Render選擇New → Blueprint
2. 連結新的MCI-Trainer-TW-v2 GitHub專案
3. Render讀取render.yaml後開始部署
4. 部署完成後使用新的公開網址測試

注意：
目前演練資料暫存在伺服器記憶體中，Render重新啟動後房間會消失。


v2.0.1：修正一次與二次檢傷操作區被即時同步重設的問題。
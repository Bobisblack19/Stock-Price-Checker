'use strict';

const mongoose = require('mongoose');
const fetch = require('node-fetch')

const Schema = mongoose.Schema;

const StockSchema = new Schema({
  symbol:{type:String, required:true},
  likes: { type:[''], default:[''] }
})

const Stock = mongoose.model("Stock", StockSchema)

exports.Stock = Stock

async function StockPrice(stock) {
  const response = await fetch (
    `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stock}/quote`
  );
  const {symbol, latestPrice} = await response.json();
  return { symbol, latestPrice }
};

async function createStock(stock, like, ip){
  const newStock = new Stock({
    symbol:stock,
    likes:like ? [ip] : []
  })
  const savedNewStock = await newStock.save()
  return savedNewStock
}

async function findStock(stock){
  return await Stock.findOne({symbol:stock}).exec()
}

async function saveStock(stock, like,ip){
  let saved = {};
  const foundStock = await findStock(stock)
  if (!foundStock){
    const createSaved = await createStock(stock, like, ip)
    saved = createSaved
    return saved;
  } else {
      if(like && foundStock.likes.indexOf(ip) === -1){
      foundStock.likes.push(ip)
    }
    saved = await foundStock.save();
    return saved;
  }
}

module.exports = function (app) {

  app.route('/api/stock-prices')
    .get(async function (req, res){
      let security = req.query.stock;
      let like = req.query.like;
      
      if (Array.isArray(security)) {
        console.log(security)

        const { symbol, latestPrice} = await StockPrice(security[0])
        const { symbol: symbol2, latestPrice: latestPrice2} = await StockPrice(security[1])

        const firstStock = await saveStock(security[0], like, req.ip)
        const secondStock = await saveStock(security[1], like, req.ip)

        let stockData = [];
        if(!symbol) {
          stockData.push({
            rel_likes: firstStock.likes.length - secondStock.likes.length
          })
        } else {
          stockData.push({
            stock:symbol,
            price:latestPrice,
            rel_likes: firstStock.likes.length - secondStock.likes.length
          })
        }

        if(!symbol2) {
          stockData.push({
            rel_likes: secondStock.likes.length - firstStock.likes.length
          })
        } else {
          stockData.push({
            stock:symbol2,
            price:latestPrice2,
            rel_likes: secondStock.likes.length - firstStock.likes.length
          })
      }

      res.json({
        stockData,
      });
      return
    }
    
      console.log(security, like)
      
      const {symbol, latestPrice} = await StockPrice(security)

      let stock = String(symbol)
      
      console.log(stock)
      
      if (!symbol){
        res.json({"stockData": like ? 1 : 0})
      }
        
      const oneStockData = await saveStock(stock, like, req.ip)
      console.log(oneStockData)

      res.json({"stockData":
        {
          "stock":symbol,
          "price":latestPrice, 
          "likes":oneStockData.likes.length}
        })
    })
}

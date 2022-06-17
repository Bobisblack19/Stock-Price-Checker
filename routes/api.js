'use strict';

const mongoose = require('mongoose');
const fetch = require('node-fetch') //allows us to get the stock data from the api 

const Schema = mongoose.Schema;

const StockSchema = new Schema({
  symbol:{type:String, required:true},
  likes: { type:[''], default:[''] }
})

const Stock = mongoose.model("Stock", StockSchema)

exports.Stock = Stock

//now we set up a asynchronus function using fetch to get the stock data from the api

async function StockPrice(stock) {
  const response = await fetch (
    `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stock}/quote`
  );//fetches the data
  const {symbol, latestPrice} = await response.json();
  return { symbol, latestPrice }
};

//these fucntions will be used as part of a larger asynchronous function later in order to save, find
//and update stock information to our database, specifically like count, etc.

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
  const foundStock = await findStock(stock) //calls async function to see if stock exists in database
  if (!foundStock){
    const createSaved = await createStock(stock, like, ip)//if it doesn't exist, we create it
    saved = createSaved
    return saved;
  } else {
      //we check if the ip address attached has liked the stock before
     //if not we add the ip to the likes array , with the length serving as the total like count
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
      
      //this is if we are comparing two stocks
      if (Array.isArray(security)) {
        console.log(security)
        
        //we get the symbol for both stocks using the stockPrice function
        const { symbol, latestPrice} = await StockPrice(security[0])
        const { symbol: symbol2, latestPrice: latestPrice2} = await StockPrice(security[1])
        
        //we save both stocks
        const firstStock = await saveStock(security[0], like, req.ip)
        const secondStock = await saveStock(security[1], like, req.ip)
        
        //we create an array to hold the stockData
        let stockData = [];
        if(!symbol) {
          //if theres no symbol for the first stock we just get the relative likes
          stockData.push({
            rel_likes: firstStock.likes.length - secondStock.likes.length
          })
        } else {
          //else we push the first stock data in to the stockdata array
          stockData.push({
            stock:symbol,
            price:latestPrice,
            rel_likes: firstStock.likes.length - secondStock.likes.length
          })
        }

        if(!symbol2) {
          //same as above but with the second stock
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
      
      //we get the symbol, latest price for the stock using the stockPrice function
      const {symbol, latestPrice} = await StockPrice(security)

      let stock = String(symbol)
      
      console.log(stock)
      
      if (!symbol){
        res.json({"stockData": like ? 1 : 0})
      }
      //we save the data to the database with onestockdata  
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

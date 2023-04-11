const puppeteer = require('puppeteer');
const fs = require("fs");

const TIMEOUT = 5000;

function wait(val) {
  return new Promise(resolve => setTimeout(resolve, val));
}

let csvRecords = [];

async function readData() {
  const readStream = fs.readFileSync('data/input/urls.csv', {
    encoding: 'utf8',
  });
  
  csvRecords.push(
    readStream.split(/\r?\n/).map((line) => {
        return line.split(',');
    })
  );  
}
  
let result = [];
result.push(
  ", URL, Name, isSecure, Sport" // TODO: change this
);

async function processUrl(url, page) {
  console.log(`processing ${url}`);
  await page.waitForSelector('title', {timeout: TIMEOUT});  

  let retVal = []
  //let orgName = await page.title();
  
  
  

    let sport = await page.evaluate(() => {

      let leftCol = []
      let rightCol = [];
      let now = new Date;

      let structure = {
          date: ((now.getMonth() > 8) ? (now.getMonth() + 1) : ('0' + (now.getMonth() + 1))) + '/' + ((now.getDate() > 9) ? now.getDate() : ('0' + now.getDate())) + '/' + now.getFullYear(),
          url: document.location.href,
          source: "sportsEngine",
          clubName: null,
          pageTemplate: null,
          level: null,
          location: null,
          contact: null,
          sportsOffered: null,
          address: null,
          gender: null,
          description: null,
          socialMedia: null,
          season: null,
          fees: null
      }

      let returnArray = [];

      let contentNodes = document.querySelectorAll(".pl-detail-section__content");

      // first part
      if(contentNodes) {
          [...contentNodes].map((mainNode)=> {
          if (mainNode) {
              [...mainNode.children].map( (item)=> {
                  leftCol.push(item.textContent.replace(/(?:\r\n|\r|\n)/g, '').replace(/\s\s+/g, ' '));
              } )
          }    
          })
      }

      // gets the optional layout
      if (document.querySelector(".pl-org-detail-summary")) {
          [...document.querySelectorAll(".pl-detail-summary-section .pl-org-detail-summary .pl-detail-subsection__content")].map((item)=>{
              rightCol.push(item.textContent.replace(/(?:\r\n|\r|\n)/g, '').replace(/\s\s+/g, ' '))
          })
      }

      [...document.querySelectorAll(".pl-detail-summary-section .pl-org-detail-summary .pl-detail-subsection__content a")].map((item) => {
              rightCol.push(item.href)
          })



      // console.log(leftCol);
      // console.log(rightCol);


      if (rightCol.length === 0) {
          structure.pageTemplate = "template 1";
          if (leftCol[0] && leftCol[0].length < 120) {
              structure.clubName = leftCol[0];
          }
          
          if (leftCol[1] && leftCol[1].length < 80) {
              structure.location = leftCol[1];
          }
          
          if (leftCol[3] && leftCol[3].length) {
              structure.sportsOffered = leftCol[3];
              
          }
          
          leftCol.map( (item) => {
              // console.log(item);
              if (item.toLowerCase().indexOf('level') !== -1) {
                  structure.level = item.toLowerCase().replace('level', '');
              } else if (item.toLowerCase().indexOf('address') !== -1) {
                  structure.address = item.replace('Address', '');
              } else if (item.indexOf('.com') !== -1 || /\d{3}-\d{4}/.test(item) && structure.contact && structure.contact.length === 0) {
                  structure.contact = item;
              }
          })
      } else {
          structure.pageTemplate = "template 2";
          structure.clubName = document.querySelector(".pl-detail-summary-section .pl-detail-summary__title").textContent;
          structure.contact = rightCol;
          structure.description = leftCol[0]
          leftCol.map( (item) => {
              if (item.indexOf('Level') !== -1) {
                  structure.level = item.replace('Level', '');
              } else if (item.indexOf('Gender') !== -1) {
                  structure.gender = item.replace('Gender', '');
              } else if (item.indexOf('Location') !== -1) {
                  structure.address = item.replace('Location', '');
              } else if (item.indexOf('Fees') !== -1) {
                  structure.fees = item.replace('Fees', '');
              } else if (item.indexOf('Season') !== -1) {
                  structure.season = item.replace('Season', '');
              }
              
          })
      }


      // console.log(structure);


      returnArray[0] = (structure.date || ' ');
      returnArray[1] = (structure.url || ' ');
      returnArray[2] = (structure.source || ' ');
      returnArray[3] = (structure.clubName || ' ');
      returnArray[4] = (structure.pageTemplate || ' ');
      returnArray[5] = (structure.level || ' ');
      returnArray[6] = (structure.location || ' ');
      returnArray[7] = (structure.contact || ' ');
      returnArray[8] = (structure.sportsOffered || ' ');
      returnArray[9] = (structure.address || ' ');
      returnArray[10] = (structure.gender || ' ');
      returnArray[11] = (structure.description || ' ');
      returnArray[12] = (structure.socialMedia || ' ');
      returnArray[13] = (structure.season || ' ');
      returnArray[14] = (structure.fees || ' ');

      // console.log(returnArray);

      return returnArray;
    });


  
  retVal.push([sport]);
  // console.info(retVal);
  return retVal;
}

(async () => {

  await readData();

  let iteration = 0;
  console.log('warming up');
  const browser = await puppeteer.launch({ headless: true });
  console.log('spawned browser');

  for (i = 0; i < csvRecords[0].length; i++) {
    
    await wait(2000);

    const page = await browser.newPage();
    console.log('spawned new page');
  

    console.log('run: %o', i);
    // console.log(csvRecords[0][i][0]);

    try {
      await page.goto(csvRecords[0][i][0], {waitUntil: 'domcontentloaded', timeout: TIMEOUT}); //{waitUntil: 'load', timeout: 5000});
      let res = await processUrl(csvRecords[0][i][0], page);
      let singleResult = [];
      singleResult.push("\n");
      singleResult.push(res[0]);


      console.log(res[0]);

      result.push("\n");
      result.push(res[0]);
      console.log('processed!');
      iteration = 0;
      fs.appendFileSync("data/output/backlink-report.csv", singleResult.join());  
      console.log('appended');
    } catch(e) {
      console.log(e);
      if (false) { // if (iteration < 1) {
        i--;
        iteration++;
        console.warn('not found - incrementing iteration: %o', iteration);
      } else {
        console.warn('not found - giving up',);
        console.log(e);
        result.push("\n");
        result.push(csvRecords[0][i][0]);
        result.push("error opening web page");
        iteration = 0;
      }
    }
    await page.close();
    
  }

  await browser.close();
  //let csv = result.join();
  //fs.appendFileSync("data/output/backlink-report.csv", csv);
  //console.log(result);
  
})();
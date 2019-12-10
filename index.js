const pti = require('puppeteer-to-istanbul')
const puppeteer = require('puppeteer')
const crypto = require('crypto')
const { promisify } = require('util')
const random = promisify(crypto.randomBytes)
const base32 = require('base32-encoding')

const runner = async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] })
  const page = await browser.newPage()
  const id = base32.stringify(await random(32))

  // Enable both JavaScript and CSS coverage
  await page.coverage.startJSCoverage()
  // Navigate to page
  const url = `https://${id}.blank.mikealrogers.com`
  await page.goto(url)

  const output = []

  let waitingLogs = false
  const log = async msg => {
    const args = await Promise.all(msg._args.map(arg => describe(arg)))
    return [msg._type, ...args.map(a => JSON.parse(a))]
  }

  const describe = h => h._context.evaluate(obj => JSON.stringify(obj), h)

  page.on('console', async msg => {
    output.push(log(msg))
    if (!waitingLogs) {
      waitingLogs = true
      while (output.length) {
        [_type, ...args] = await output.shift()
        console[_type](...args)
      }
      waitingLogs = false
    }
  })

  await page.evaluate(async () => {
    console.log('asdf', 1, 2)
    console.log({fancy: 'hello'})
  })

  const jsCoverage = await page.coverage.stopJSCoverage()
  console.log(jsCoverage)
  pti.write(jsCoverage)
  await browser.close()
}
runner()

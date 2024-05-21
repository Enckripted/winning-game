const DEBUG_MODE = false

let number = 0
let highestNumber = 0
let baseNumberPerSec = 1

let winPoints = 0
let wins = 0
let fastestWin = 10
let lastWinTime = 0
let autoWinVal = 0
let autoWinEnabled = false

let pop = 2

let lootboxes = 0
let buffs = []

let totalBuildings = 0
let buildings = {
    farms: 0,
    houses: 0,
    labs: 0,
    packagings: 0
}

let overheat = 0

let currentTab = "game"

class Upgrade{
    constructor(price, element, onbuy){
        this.price = price
        this.element = element
        this.onbuy = onbuy
        this.bought = false

        element.on('click', () => {
            this.buy()
        })
    }

    buy(free){
        if(winPoints < this.price && !free) return
        if(this.bought) return
        
        if(!free) winPoints -= this.price
        if(this.onbuy) this.onbuy()
        this.bought = true

        this.element.find('.win-upgrade-cost').html('BOUGHT!')
    }
}

let lootNames = [['Cap', 'Sunglasses'], ['Gamer T-Shirt', 'Tank Top'], ['Ripped Jeans', 'Sweatpants'], ['Sandals', 'Js']]
let buffTypes = ['Number Per Second', 'WP Gain', 'Population Growth']
let rarities = ['Normal', 'Rare', 'Legendary', 'Exotic']
class Item{
    constructor(type, rarity){
        this.type = type
        if(type == -1) return //essentially create a dummy if type is -1
        this.nameIndex = Math.round(random(0, lootNames[type].length - 1))
        this.buffType = Math.round(random(0, buffTypes.length - 1))
        this.buffAmount = 0
        this.rarity = rarity

        switch(this.buffType){
            case 0: //nps multiplier
                this.buffAmount = random(30, 99) * Math.pow(rarity + 1, 8)
                break
            case 1: //wp gain multiplier
                this.buffAmount = random(1, 2) * Math.pow(rarity + 1, 2)
                break
            case 2: //pop reprod % addition
                this.buffAmount = random(0, 0.5) * Math.pow(rarity + 1, 1.5)
                break
        }
        this.buffAmount = Math.round(this.buffAmount * 100) / 100
    }

    getName(){
        if(this.type == -1) return 'Nothing'
        let buff = ''
        if(this.buffType == 2){
            buff = '+' + this.buffAmount.toFixed(2) + '%'
        }else{
            buff = 'x' + this.buffAmount.toFixed(2)
        }
        return rarities[this.rarity] + ' ' + buff + ' ' + buffTypes[this.buffType] + ' ' + lootNames[this.type][this.nameIndex]
    }

    getColor(){
        if(this.type == -1) return 'white'
        switch(this.rarity){
            case 0:
                return 'yellow'
            case 1:
                return 'teal'
            case 2:
                return 'orange'
            case 3:
                return 'red'
        }
    }
}

let upgrades = {
    'w1': new Upgrade(1, $('#w1')),
    'w2': new Upgrade(5, $('#w2')),
    'w3': new Upgrade(10, $('#w3')),
    'w4': new Upgrade(15, $('#w4'), () => {
        $('#win-text').addClass('d-none')
        $('#win-button').removeClass('d-none')
        $('.no-win').removeClass('d-none')
    }),
    'w5': new Upgrade(100, $('#w5')),
    'w6': new Upgrade(250, $('#w6')),
    'w7': new Upgrade(300, $('#w7')),
    'w8': new Upgrade(500, $('#w8'), () => {
        $('.auto-win').removeClass('d-none')
    }),
    'w9': new Upgrade(4000, $('#w9')),
    'w10': new Upgrade(15000, $('#w10')),
    'w11': new Upgrade(40000, $('#w11')),
    'w12': new Upgrade(2e5, $('#w12'), () => {
        $('#win-upgrades-tab').removeClass('d-none')
        $('#win-village-tab').removeClass('d-none')
    }),
    'w13': new Upgrade(1e6, $('#w13')),
    'w16': new Upgrade(3e10, $('#w16'), () => {
        $('#win-loot-tab').removeClass('d-none')
    })
}
let unboxedLoot = new Item(-1, 0)
let equippedLoot = [new Item(-1, 0), new Item(-1, 0), new Item(-1, 0), new Item(-1, 0)]

function random(min, max){
    return min + (Math.random() * (max - min))
}

let ends = ['K', 'M', 'B', 'T']
function format(num){
    if(num < 1e3){
        return num
    }
    let digits = Math.floor(Math.log10(num))
    let endNum = Math.floor(digits / 3) - 1
    if(endNum > ends.length - 1){
        return (num / Math.pow(10, digits)).toFixed(2) + 'e' + digits
    }else{
        return (num / Math.pow(10, (endNum + 1) * 3)).toFixed(2) + ' ' + ends[endNum]
    }
}

function log(base, num){
    if(num < 1) return 0
    return Math.log(num) / Math.log(base)
}

function parseNumber(text){
    if(text.indexOf('e') == -1){
        try{
            let num = parseInt(text)
            return num
        }catch(e){
            return 0
        }
    }else{
        let splits = text.split('e')
        console.log(splits[1])
        console.log(parseInt(Math.pow(10, splits[1])))
        try{
            let num = parseInt(splits[0]) * Math.pow(10, parseInt(splits[1]))
            return num
        }catch(e){
            return 0
        }
    }
}

function hasUpgrade(id){
    return upgrades[id].bought
}

function switchTab(tab){
    $('#' + currentTab + '-content').addClass('d-none')
    $('#' + tab + '-content').removeClass('d-none')
    currentTab = tab
}

let currentWinSubtab = 'upgrades'
function switchWinSubtab(tab){
    $('#win-' + currentWinSubtab).addClass('d-none')
    $('#win-' + currentWinSubtab + '-tab').removeClass('win-selected')
    $('#win-' + tab).removeClass('d-none')
    $('#win-' + tab + '-tab').addClass('win-selected')
    currentWinSubtab = tab
}

function displayLoot(element, loot){
    element.css('color', loot.getColor())
    element.html(loot.getName())
}

function calcWinPoints(){
    if(number < 10) return 0

    let runTime = (Date.now() - lastWinTime) / 1000
    let w9Mult = hasUpgrade('w9') ? Math.max(1, log(1.5, runTime)) : 1

    let buffMult = 1
    for(let buff of buffs[1]){
        buffMult *= buff
    }

    return Math.floor(1 + Math.pow(number - 10, 0.25) * w9Mult * buffMult)
}

function calcBuildingCost(){
    return 100 * Math.pow(15, totalBuildings)
}

function unbox(){
    lootboxes -= 1

    let rarity = -1
    let rarityChance = random(0, 100)
    if(rarityChance < 0.01){
        rarity = 3
    }else if(rarityChance < 0.5){
        rarity = 2
    }else if(rarityChance < 5){
        rarity = 1
    }else if(rarityChance < 50){
        rarity = 0
    }
    
    if(rarity < 0){
        unboxedLoot = new Item(-1, 0)
    }else{
        unboxedLoot = new Item(Math.round(random(0, 3)), rarity)
    }
}

function equip(){
    if(!unboxedLoot) return
    equippedLoot[unboxedLoot.type] = unboxedLoot
    unboxedLoot = new Item(-1, 0)
}

function buyBuilding(name){
    let cost = calcBuildingCost()
    if(winPoints < cost) return
    
    winPoints -= cost
    buildings[name] += 1
    totalBuildings += 1
}

function removeBuilding(name){
    if(buildings[name] == 0) return

    buildings[name] -= 1
    totalBuildings -= 1
    winPoints += calcBuildingCost()
}

function win(){
    let winTime = (Date.now() - lastWinTime) / 1000
    let w9Mult = Math.max(1, log(1.5, winTime))
    if(!hasUpgrade('w9')) w9Mult = 1
    
    if(number < 10) return
    if(hasUpgrade('w4')){
        let gain = Math.floor(calcWinPoints())
        winPoints += gain
    }else{
        winPoints += 1
    }

    number = 0
    wins += Math.floor(1 * w9Mult)
    
    if(winTime < fastestWin) fastestWin = winTime
    if(fastestWin < 0.05) fastestWin = 0.05
    lastWinTime = Date.now()

    if(wins == 1){
        $('#win-tab').removeClass('d-none')
        $('#wp').removeClass('d-none')
    }
    
    $('.no-win').removeClass('d-none')
    if(!hasUpgrade('w4')) $('.win').addClass('d-none')
}

//20 updates a sec
function update(){
    //loot
    buffs = []
    for(let i = 0; i < buffTypes.length; i++){
        buffs[i] = []
    }
    for(let loot of equippedLoot){
        if(loot.type == -1) continue
        if(!buffs[loot.buffType]){
            buffs[loot.buffType] = [loot.buffAmount]
        }else{
            buffs[loot.buffType].push(loot.buffAmount)
        }
    }

    displayLoot($('#loot-unbox'), unboxedLoot)
    displayLoot($('#loot-head').find('.loot-name'), equippedLoot[0])
    displayLoot($('#loot-chest').find('.loot-name'), equippedLoot[1])
    displayLoot($('#loot-legs').find('.loot-name'), equippedLoot[2])
    displayLoot($('#loot-feet').find('.loot-name'), equippedLoot[3])
    
    $('#lootbox-amount').html(`You have ${Math.floor(lootboxes)} lootboxes (+${format((Math.pow(1.25, buildings.packagings) - 1).toFixed(2))}/s from village packaging plants)`)
    
    //village
    let farms = buildings['farms']
    let houses = buildings['houses']
    let labs = buildings['labs']
    let packagings = buildings['packagings']

    let popPerSecond = 1
    let popGrowthPercent = 0.001
    let popCap = 0
    let popMult = 1.1
    let wpGainMult = 1
    
    let farmBoost = Math.pow(1.3, farms) * 0.002 - 0.002
    let housingBoost = Math.pow(10, Math.pow(houses + 1, 1.15))
    let labBoost = Math.pow(1.66, labs)
    let packagingBoost = Math.pow(1.25, packagings) - 1

    popGrowthPercent += farmBoost
    for(let buff of buffs[2]){
        popGrowthPercent += buff / 100
    }
    popPerSecond = pop * popGrowthPercent
    popCap += housingBoost
    wpGainMult *= labBoost
    lootboxes += packagingBoost / 20
    
    if(hasUpgrade('w12')){
        console.log(pop)
        pop += popPerSecond / 20
        if(pop > popCap) pop = popCap
    }

    $('#pop').html(`You have a population of ${format(Math.floor(pop))}, providing a x${format((Math.floor(pop) * popMult + 1).toFixed(2))} boost to number gain (x${format(popMult.toFixed(2))} per population)`)
    $('#pop-growth').html(`+${format(popPerSecond.toFixed(2))} pop/s (${(popGrowthPercent * 100).toFixed(2)}% reprod chance) - capped at ${format(Math.floor(popCap))}`)
    if(pop == popCap){
        $('#pop-growth').css('color', 'yellow')
    }else{
        $('#pop-growth').css('color', 'white')
    }
        
    $('#farm').html('Farms: ' + farms)
    $('#farm-cost').html('Cost: ' + format(calcBuildingCost()))
    $('#farm-effect').html(`Your farms are boosting population reproduction chance by +${format((farmBoost * 100).toFixed(2))}%`)

    $('#house').html('Houses: ' + houses)
    $('#house-cost').html('Cost: ' + format(calcBuildingCost()))
    $('#house-effect').html(`Your houses increase the population cap by +${format(housingBoost.toFixed(2))}`)

    $('#lab').html('Labs: ' + labs)
    $('#lab-cost').html('Cost: ' + format(calcBuildingCost()))
    $('#lab-effect').html(`Your labs multiply win point gain by x${format(labBoost.toFixed(2))}`)

    $('#packaging').html('Packaging Plants: ' + packagings)
    $('#packaging-cost').html('Cost: ' + format(calcBuildingCost()))
    $('#packaging-effect').html(`Your packaging plants are packaging ${format(packagingBoost.toFixed(2))} lootboxes a second`)
    
    //winning
    if(number >= 10 && hasUpgrade('w4')){
        $('#win-button').html(`Click here to get ${format(calcWinPoints())} win points!`)
    }else if(number >= 10){
        $('.no-win').addClass('d-none')
        $('.win').removeClass('d-none')
    }

    if(hasUpgrade('w10')){
        $('#wp-per-min').removeClass('d-none')
        let time = (Date.now() - lastWinTime) / 1000
        $('#wp-per-min').html(`${format(Math.floor(calcWinPoints() / time * 60))} WP gain/min`)
    }
    
    if(hasUpgrade('w8')){
        $('.auto-win').removeClass('d-none')
        if(calcWinPoints() >= autoWinVal && autoWinEnabled && number >= 10) win()
    }

    if(hasUpgrade('w13')){
        wins += (1 / fastestWin) * 0.25
    }
    

    $('#wp').html('WP: ' + format(winPoints))
    $('#win-points').html('Win points: ' + format(winPoints))
    $('#win-amount').html('Wins: ' + format(Math.floor(wins)))
    $('#win-time').html(`Your fastest win was in ${fastestWin.toFixed(2)} seconds` + (fastestWin < 0.06 ? ' - MAXED' : ''))

    //Calculate number per sec
    let numberPerSec = baseNumberPerSec
    let mults = []
    if(hasUpgrade('w2')){
        let mult = Math.max(1, Math.pow(winPoints, 0.7))
        mults.push(mult)
        numberPerSec *= mult
        $('#w2').find('.win-upgrade-effect').html('Currently: x' + format(mult.toFixed(2)))
    }
    if(hasUpgrade('w3')){
        let mult = Math.max(1, Math.pow(1.2, 10 - fastestWin / 1000))
        numberPerSec *= mult
        $('#w3').find('.win-upgrade-effect').html('Currently: x' + format(mult.toFixed(2)))
    }
    if(hasUpgrade('w5')){
        let mult = 1 + Math.max(1, Math.pow(wins, 0.5))
        mults.push(mult)
        numberPerSec *= mult
        $('#w5').find('.win-upgrade-effect').html('Currently: x' + format(mult.toFixed(2)))
    }
    if(hasUpgrade('w6')){
        let mult = Math.max(1, Math.pow(number, 0.2))
        mults.push(mult)
        numberPerSec *= mult
        $('#w6').find('.win-upgrade-effect').html('Currently: x' + format(mult.toFixed(2)))
    }
    if(hasUpgrade('w7')){
        let mult = Math.pow(highestNumber, 0.15)
        mults.push(mult)
        numberPerSec *= mult
        $('#w7').find('.win-upgrade-effect').html('Currently: x' + format(mult.toFixed(2)))
    }
    if(hasUpgrade('w9')){
        let mult = Math.max(1, log(1.5, (Date.now() - lastWinTime) / 1000))
        mults.push(mult)
        $('#w9').find('.win-upgrade-effect').html('Currently: x' + format(mult.toFixed(2)))
    }
    if(hasUpgrade('w10')){
        let mult = Math.max(1, log(2, calcWinPoints()))
        mults.push(mult)
        numberPerSec *= mult
        $('#w10').find('.win-upgrade-effect').html('Currently: x' + format(mult.toFixed(2)))
    }
    if(hasUpgrade('w11')){
        let mult = 0
        for(let m of mults){
            if(mult == 0) mult = m
            if(m < mult) mult = m
        }
        mult = Math.pow(mult, 1.5)
        numberPerSec *= mult
        $('#w11').find('.win-upgrade-effect').html('Currently: x' + format(mult.toFixed(2)))
    }
    if(hasUpgrade('w12')){
        numberPerSec *= Math.floor(pop) * popMult + 1
    }
    for(let buff of buffs[0]){
        numberPerSec *= buff
    }
    
    number += numberPerSec / 20
    if(number >  highestNumber) highestNumber = number
    if(number >= 10 && !hasUpgrade('w4')) number = 10
    $('#n').html('N: ' + format(Math.floor(number)))
    $('#number').html(format(Math.floor(number)))
    $('#number-per-sec').html(`+${format(Math.floor(numberPerSec))}/s`)
}

function init(){
    loadSave()
    
    $('.win').addClass('d-none')
    if(wins > 0) $('#win-button').removeClass('d-none')
    $('#win-button').on('click', win)

    $('#game-tab').on('click', () => {
        switchTab('game')
    })
    $('#win-tab').on('click', () => {
        switchTab('win')
    })
    $('#options-tab').on('click', () => {
        switchTab('options')
    })

    $('#number').on('click', () => {
        if(hasUpgrade('w1')) number += 1
    })

    $('#auto-win').on('change', () => {
        let val = parseNumber($('#auto-win').val())
        if(val == 0 && $('#auto-win').val() != '0') $('#auto-win').val(autoWinVal)
        autoWinVal = val
    })
    $('#auto-win').val(autoWinVal)
    $('#auto-win-enabled').on('change', () => {
        autoWinEnabled = !autoWinEnabled
    })
    $('#auto-win-enabled').prop('checked', autoWinEnabled)

    
    $('#win-upgrades-tab').on('click', () => {
        switchWinSubtab('upgrades')
    })
    $('#win-village-tab').on('click', () => {
        switchWinSubtab('village')
    })
    $('#win-loot-tab').on('click', () => {
        switchWinSubtab('loot')
    })
    $('#win-upgrades-tab').trigger('click')

    $('#farm-buy').on('click', () => {
        buyBuilding('farms')
    })
    $('#farm-remove').on('click', () => {
        removeBuilding('farms')
    })
    $('#house-buy').on('click', () => {
        buyBuilding('houses')
    })
    $('#house-remove').on('click', () => {
        removeBuilding('houses')
    })
    $('#lab-buy').on('click', () => {
        buyBuilding('labs')
    })
    $('#lab-remove').on('click', () => {
        removeBuilding('labs')
    })
    $('#packaging-buy').on('click', () => {
        buyBuilding('packagings')
    })
    $('#packaging-remove').on('click', () => {
        removeBuilding('packagings')
    })

    $('#unbox').on('click', unbox)
    $('#equip').on('click', equip)
    
    $('.content').addClass('d-none')
    switchTab('game')

    $('#save').on('click', save)
    $('#export').on('click', exportSave)
    $('#import').on('click', importSave)
    $('#reset').on('click', reset)

    lastWinTime = Date.now()
    setInterval(update, 50)
    setInterval(save, 30000)
    
    if(DEBUG_MODE) debug()
}

function compressLootForSave(loot){
    if(loot.type == -1) return [loot.type]
    return [loot.type, loot.rarity, loot.nameIndex, loot.buffType, loot.buffAmount]
}

function uncompressLootFromSave(loot){
    let a = new Item(-1, 0)
    if(loot.type == -1) return a
    a.type = loot[0]
    a.rarity = 0
    a.nameIndex = loot[2]
    a.buffType = loot[3]
    a.buffAmount = loot[4]
    return a
}

function save(){
    let saveData = {
        number: number,
        highestNumber: highestNumber,
        winPoints: winPoints,
        wins: wins,
        fastestWin: fastestWin,
        autoWinVal: autoWinVal,
        autoWinEnabled: autoWinEnabled,
        pop: pop,
        buildings: buildings,
        boughtUpgrades: [],
        lootboxes: lootboxes,
        unboxedLoot: compressLootForSave(unboxedLoot),
        loot: [],
    }
    for(let u in upgrades){
        if(upgrades[u].bought){
            saveData.boughtUpgrades.push(u)
        }
    }
    for(let l of equippedLoot){
        saveData.loot.push(compressLootForSave(l))
    }
    localStorage.setItem('devsave1', btoa(JSON.stringify(saveData)))
}

function exportSave(){
    save()
    navigator.clipboard.writeText(localStorage.getItem('devsave1'))
    alert('Copied your save to the clipboard!')
}

function importSave(){
    let data = prompt('Paste your save data here: ')
    loadSave(data)
    save()
    location.reload()
}

function loadSave(data){
    if(!data) data = localStorage.getItem('devsave1')

    if(true && data){
        let saveData = JSON.parse(atob(data))
        console.log(saveData)
        number = saveData.number
        highestNumber = saveData.highestNumber
        winPoints = saveData.winPoints
        wins = saveData.wins
        fastestWin = saveData.fastestWin
        autoWinVal = saveData.autoWinVal
        autoWinEnabled = saveData.autoWinEnabled
        buildings = saveData.buildings
        pop = saveData.pop
        unboxedLoot = uncompressLootFromSave(saveData.unboxedLoot)
        equippedLoot = []

        for(let amount of Object.entries(buildings)){
            console.log(amount)
            totalBuildings += amount[1]
        }
        for(let upgrade of saveData.boughtUpgrades){
            upgrades[upgrade].buy(true)
        }
        for(let loot of saveData.loot){
            equippedLoot.push(uncompressLootFromSave(loot))
        }
        
        if(wins > 0){
            $('#win-tab').removeClass('d-none')
            $('#wp').removeClass('d-none')
        }

        $('#auto-win').attr('val', autoWinVal)
    }
}

function reset(){
    localStorage.clear()
    location.reload()
}

let fastForward = false
let ticks = 0
let intv
function debug(){
    $('body').on('keypress', (e) => {
        if(e.keyCode != 101) return
        if(fastForward){
            fastForward = false
            ticks = 0
            $('#debug').html('')
            clearInterval(intv)
        }else{
            fastForward = true
            intv = setInterval(() => {
                ticks += 1
                $('#debug').html(`${Math.floor(ticks / 20)} seconds - ${ticks} ticks`)
                update()
            })
        }
    })
    /*
    win()
    winPoints += 999999
    setInterval(() => {
        $('#number').trigger('click')
    })
    */
}

init()

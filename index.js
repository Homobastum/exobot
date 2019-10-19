const connectivity = require('connectivity');
const https = require('https');
const convert = require('xml-js');
const fs = require('fs');
const Discord = require('discord.js');
const Exobot = new Discord.Client();

Exobot.on('ready', () => {
    console.log(`Connecté en tant que ${Exobot.user.tag}`);

    // Statut aléatoire
    randomActivity();

    // RSS Feed
    rssRequest('https://store.steampowered.com/feeds/daily_deals.xml', './data/steam_daily_deals.json', 'steamDailyDeals');
    rssRequest('https://blog.humblebundle.com/feed/', './data/humble_game_bundle.json', 'humbleGameBundle');
    rssRequest('https://itch.io/feed/sales.xml', './data/itch_io_sales.json', 'itchIOSales');
    rssRequest('https://itch.io/games/free.xml', './data/itch_io_free.json', 'itchIOFree');
    
    setInterval(function () {
        // Vérification de la connexion toutes les 5 minutes
        connectivity(function (online) {
            if (online) {
                console.log('Connexion à internet: OK');

                // Statut aléatoire toutes les 5 minutes
                randomActivity();

                // RSS Feed toutes les 5 minutes
                rssRequest('https://store.steampowered.com/feeds/daily_deals.xml', './data/steam_daily_deals.json', 'steamDailyDeals');
                rssRequest('https://blog.humblebundle.com/feed/', './data/humble_game_bundle.json', 'humbleGameBundle');
                rssRequest('https://itch.io/feed/sales.xml', './data/itch_io_sales.json', 'itchIOSales');
                rssRequest('https://itch.io/games/free.xml', './data/itch_io_free.json', 'itchIOFree');
            } else {
                console.log('Connexion à internet: KO');
            }
        });
    }, 300000);
});

Exobot.on('message', msg => {
    // Test du ping
    if (msg.content === 'Ping') {
        msg.reply('Pong !');
    }

    // Reply si Exobot
    if (msg.content.toLowerCase().includes('exobot') && msg.author.username !== 'Exobot') {
        const attachment = new Discord.Attachment('./img/its_me.png');
        msg.channel.send(`${msg.author}, It\'s me, Exobot !`, attachment);
        // msg.reply('It\'s me, Ex0b0t !');
    }

    // Supprimer les messages d'un channel
    if (msg.content == "!clean") {
        if (msg.member.hasPermission("MANAGE_MESSAGES")) {
            msg.channel.fetchMessages()
                .then(function (list) {
                    msg.channel.bulkDelete(list);
                }, function (err) { msg.channel.send("ERROR: ERROR CLEARING CHANNEL.") })
        }
    }
});

// Message de bienvenue aux nouveaux membres sur le canal #general
Exobot.on('guildMemberAdd', member => {
    const generalChannel = member.guild.channels.find(ch => ch.name === 'general');
    if (!generalChannel) { return; }

    let embed = new Discord.RichEmbed()
        .setColor('#B73080')
        .setDescription(`Bienvenue à toi <@${member.user.id}>, cher gamer Exodatien ! :wave:`);
    return generalChannel.send({ embed });
});

// Message pour avertir les autres membres du départ de l'un d'entre eux sur le canal #general
Exobot.on('guildMemberRemove', member => {
    const generalChannel = member.guild.channels.find(ch => ch.name === 'general');
    if (!generalChannel) { return; }

    let embed = new Discord.RichEmbed()
        .setColor('#B73080')
        .setDescription(`<@${member.user.id}> a ragequit...`);
    return generalChannel.send({ embed });

});

Exobot.login('NjI1NTcyMjIyMjU3MzMyMjI1.XYhtmA.fkR15CCYDV-kGtli69EQmUgRA6s');

// Fonctions
function randomActivity() {
    let activities = [
        [
            'Terminator',
            'WATCHING'
        ],
        [
            'Megaman',
            'PLAYING'
        ],
        [
            'Metallica - Hit the Lights',
            'LISTENING'
        ]
    ];

    let noActivity = Math.floor(Math.random() * (activities.length));
    setActivity(activities[noActivity]);
}

function setActivity (activity) {
    Exobot.user.setActivity(activity[0], { type: activity[1] })
        .then(presence => console.log(`Activity set to ${presence.game ? presence.game.name : 'none'}`))
        .catch(console.error);
}

function rssRequest (url, dataPath, dataParseFunction) {
    const options = {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    };

    https.get(url, options, (resp) => {
        let data_request = '';

        // A chunk of data has been recieved.
        resp.on('data', (chunk) => {
            data_request += chunk;
        });

        // The whole response has been received. Print out the result.
        let readObj = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

        resp.on('end', () => {
            let xml = data_request;
            result = convert.xml2js(xml, { compact: true, spaces: 4 });

            readObj = dataParse[dataParseFunction](readObj, result);

            let json = JSON.stringify(readObj);
            fs.writeFile(dataPath, json, 'utf8', (err) => {
                if (err) throw err;
                console.log('Les url ont bien été enregistrées.');
            });
        });
    }).on("error", (err) => {
        console.log("Error: " + err.message);
    });
}

const dataParse = {
    steamDailyDeals: function (readObj, result) {
        let items = result['rdf:RDF'].item;
        for (let noItem in items) {
            let titre = items[noItem].title._cdata;
            let url = items[noItem].link._cdata;

            if (readObj.length <= 0 || !readObj.includes(url)) {
                readObj.push(url);

                Exobot.channels.get('629079928855330836').send(`${titre}: ${url}`);
            }
        }

        return readObj;
    },

    humbleGameBundle: function (readObj, result) {
        let items = result.rss.channel.item;
        for (let noItem in items) {
            let titre = items[noItem].title._text;
            let url = items[noItem].link._text;

            let categoriesOriginales = items[noItem].category;
            let categories = [];
            for (let noCat in categoriesOriginales) {
                categories.push(categoriesOriginales[noCat]._text);
            }

            if (categories.length > 0 && categories.includes('humble game bundle') && (readObj.length <= 0 || !readObj.includes(url))) {
                readObj.push(url);

                Exobot.channels.get('629198152099954689').send(`${titre}: ${url}`);
            }
        }

        return readObj;
    },

    itchIOSales: function (readObj, result) {
        let items = result.rss.channel.item;
        for (let noItem in items) {
            let titre = items[noItem].title._text;
            let url = items[noItem].link._text;
            
            if (readObj.length <= 0 || !readObj.includes(url)) {
                readObj.push(url);

                Exobot.channels.get('629268757004550174').send(`${titre}: ${url}`);
            }
        }

        return readObj;
    },

    itchIOFree: function (readObj, result) {
        let items = result.rss.channel.item;
        for (let noItem in items) {
            let titre = items[noItem].title._text;
            let url = items[noItem].link._text;

            if (readObj.length <= 0 || !readObj.includes(url)) {
                readObj.push(url);

                Exobot.channels.get('629273618169462790').send(`${titre}: ${url}`);
            }
        }

        return readObj;
    }
};

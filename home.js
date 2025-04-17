const path = require("path");
const express= require("express");
const app= express();
const fs =require("fs")
const readline=require("readline");
require("dotenv").config({ path: path.resolve(__dirname, 'MongoDB/credentialsDontPost/.env') }) 
const uri = process.env.MONGO_CONNECTION_STRING;
 /* Our database and collection */
const databaseAndCollection = {db: "FinalProject", collection:"NBADB"};

const line=readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "Stop to shutdown the server: "
})

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"Views"));
app.use(express.urlencoded({extended:true}));

let PORTNUMBER=process.argv[2];
app.listen(PORTNUMBER,()=>{
    console.log(`Web server started and running at http://localhost:${PORTNUMBER}`);
    line.prompt();
});

//Check's uer input
line.on("line",(input)=>{
    if(input.trim()==="stop"){
        console.log("Shutting down the server");
        process.exit(0);
    }
});

app.get("/", (request, response) => {
    response.render("home");
}); 

//When "HOME" is clicked
app.get("/home", (request, response) => {
    response.render("home");
}); 

//Browser through player selection
app.get("/browsePlayers",(request,response)=>{
    response.render("browsePlayers",{port: PORTNUMBER});
});

//Player Selection Details
app.post("/browsePlayers",async(request,response)=>{
    const {firstname,lastname} = request.body;
    const playerTable=await searchPlayerStats(firstname,lastname);
    response.render("browsePlayersTable",{playerTable});
});

//When filling out Review Application Form
app.get("/browseTeams",(request,response)=>{
    response.render("browseTeams",{port: PORTNUMBER});
});

//When filling out Review Application Form
app.post("/browseTeams", async(request,response)=>{
    const {teamname} = request.body;
    const teamsTable=await searchTeam(teamname);
    response.render("browseTeamsTables",{teamsTable});
});

app.get("/addToRoster", (request,response)=>{
    response.render("addToRoster",{port: PORTNUMBER});
});

app.post("/addToRoster",(request,response)=>{
    let {yourname,pg,sg,sf,pf,c} = request.body;
    init("addPlayers",yourname,pg,sg,sf,pf,c);
    response.render("addRosterData",{yourname,pg,sg,sf,pf,c});
});


app.get("/viewRoster", (request,response)=>{
    response.render("viewRoster",{port: PORTNUMBER});
});

app.post("/viewRoster", async(request,response)=>{
    const {user}=request.body;  
    const results = await init("getUser",user,null,null,null,null,null);
    const {username,pg,sg,sf,pf,c}=results[0];
    let rosterTable =viewTableGenerator(username,pg,sg,sf,pf,c);

    response.render("viewRosterTable",{rosterTable,username});
});


async function searchTeam(teamname){
    const url = `https://api-nba-v1.p.rapidapi.com/teams?search=${teamname}`;
    const options = {
        method: 'GET',
        headers: {
            'x-rapidapi-key': 'bba27284f8msh197af716233e471p16821ajsn388ec976688c',
            'x-rapidapi-host': 'api-nba-v1.p.rapidapi.com'
        }
    };
    
    try {
        const response = await fetch(url, options);
        const text = await response.text();

        const regex= new RegExp(`\\{"id":\\d+.*?\\}`, "g");
        const result=text.match(regex);

        const match=result[0];

        const nameStart = match.indexOf('"name":') + 8;
        const nameEnd = match.indexOf('"', nameStart);
        const name = match.substring(nameStart, nameEnd).trim();

        const nicknameStart = match.indexOf('"nickname":') + 12;
        const nicknameEnd = match.indexOf('"', nicknameStart);
        const nickname = match.substring(nicknameStart, nicknameEnd).trim();

        const codeStart = match.indexOf('"code":') + 8;
        const codeEnd = match.indexOf('"', codeStart);
        const code = match.substring(codeStart, codeEnd).trim();

        const cityStart = match.indexOf('"city":') + 8;
        const cityEnd = match.indexOf('"', cityStart);
        const city = match.substring(cityStart, cityEnd).trim();    

        const logoStart = match.indexOf('"logo":') + 8;
        const logoEnd = match.indexOf('"', logoStart);
        const logo = match.substring(logoStart, logoEnd).trim();

        const allStarStart = match.indexOf('"allStar":') + 10;
        const allStarEnd = match.indexOf(',', allStarStart);
        const allStar = match.substring(allStarStart, allStarEnd).trim() === "true";

        const leaguesStart = match.indexOf('"leagues":') + 10;
        const leaguesEnd = match.indexOf('}', leaguesStart) + 1;
        const leagues = match.substring(leaguesStart, leaguesEnd).trim();
        console.log("Leag "+leagues);

        const conferenceStart = match.indexOf('"conference":') + 13;
        const conferenceEnd = match.indexOf(':', conferenceStart);
        const data = match.substring(conferenceStart, conferenceEnd).trim();

        const [conference,garabe]=data.replace(/"/g, '').split(',');

        const divisionStart =conferenceStart + 19;
        const divisionEnd = match.indexOf('}', divisionStart);
        const division = match.substring(divisionStart,divisionEnd-1).trim();


        console.log("Start: "+divisionStart);
        console.log("End: "+divisionEnd);

        console.log("Div: "+division);

        const final=tableTeamGenerator(name,nickname,code,city,logo,allStar,conference,division);
        return final;

        

    } catch (error) {
        console.error(error);
    }


}


async function searchPlayerStats(firstname,lastname){ //Expects users to give proper names
        //Filter players by first and last name
        const url = `https://api-nba-v1.p.rapidapi.com/players?search=${lastname}`;
        
        const options = {
            method: 'GET',
            headers: {
                'x-rapidapi-key': '4fbb7ab8e8msh1ab826ecb416a12p123463jsn17596e674271',
	        	'x-rapidapi-host': 'api-nba-v1.p.rapidapi.com'
            }
        };

        try {
            const response = await fetch(url, options);
            const text = await response.text();

            const regex= new RegExp(`\\{"id":\\d+,"firstname":"${firstname}","lastname":"${lastname}".*?\\}`, "g");
            const result=text.match(regex);

            const match=result[0];

            const idStart= match.indexOf('"id":')+5;
            const idEnd= match.indexOf(',',idStart);
            const id= match.substring(idStart,idEnd);

            // //Calls player by ID
            const urlID =`https://api-nba-v1.p.rapidapi.com/players?id=${id}`;
            const optionsID = {
                method: 'GET',
                headers: {
                    'x-rapidapi-key': '4fbb7ab8e8msh1ab826ecb416a12p123463jsn17596e674271',
	        	    'x-rapidapi-host': 'api-nba-v1.p.rapidapi.com'
                }
            };

            try {
                const responseID = await fetch(urlID, optionsID);
                const textID = await responseID.text();
                
                //Birth
                const regex= new RegExp(`\\{"id":\\d+,"firstname":"${firstname}","lastname":"${lastname}",(.*)\\}`,"g");
                const resultID=textID.match(regex);
                const match=resultID[0];

                const birthStart = match.indexOf('"birth":') + 8;
                const birthEnd = match.indexOf('}', birthStart) + 1;
                const birthSection = match.substring(birthStart, birthEnd).trim();

                //Birth
                // console.log("BIRTH")
                const birthDateStart = birthSection.indexOf('"date":') + 8;
                const birthDateEnd = birthSection.indexOf('"', birthDateStart);
                const birthDate = birthSection.substring(birthDateStart, birthDateEnd).trim();                
                const countryStart = birthSection.indexOf('"country":') + 11;
                const countryEnd = birthSection.indexOf('"', countryStart);
                const country = birthSection.substring(countryStart, countryEnd);
     
                //Start
                // console.log("START")
                const nbaStart = match.indexOf('"nba":') + 6;
                console.log("NBA START: "+nbaStart)
                const nbaEnd = match.indexOf('}', nbaStart) + 1;
                console.log("NBA END: "+nbaEnd)
                const nbaSection = match.substring(nbaStart, nbaEnd).trim();
                console.log("NBA SECTION:"+nbaSection)

                const nbaStartYearStart = nbaSection.indexOf('"start":') + 8;
                const nbaStartYearEnd = nbaSection.indexOf(',', nbaStartYearStart);
                const nbaStartYear = nbaSection.substring(nbaStartYearStart, nbaStartYearEnd);
                console.log("START YEAR:"+nbaStartYear);

                //Height
                const heightStart = match.indexOf('"height":') + 10; 
                const heightEnd = match.indexOf('}', heightStart) + 1;
                const heightSection = match.substring(heightStart, heightEnd).trim(); 

                const heightFeetStart = heightSection.indexOf('"feets":') + 9;
                const heightFeetEnd = heightSection.indexOf('"', heightFeetStart);
                const heightFeet = heightSection.substring(heightFeetStart, heightFeetEnd);

                const heightInchesStart = heightSection.indexOf('"inches":') + 10;
                const heightInchesEnd = heightSection.indexOf('"', heightInchesStart);
                const heightInches = heightSection.substring(heightInchesStart, heightInchesEnd);
                const height = `${heightFeet}'${heightInches}`;

                //Weight
                const weightStart = match.indexOf('"weight":') + 10;
                const weightEnd = match.indexOf('}', weightStart) + 1;
                const weightSection = match.substring(weightStart, weightEnd).trim();
                
                const weightPoundsStart = weightSection.indexOf('"pounds":') + 10;
                const weightPoundsEnd = weightSection.indexOf('"', weightPoundsStart);
                const weight = weightSection.substring(weightPoundsStart, weightPoundsEnd);
                console.log("WEIGHT:"+weight);

                //College
                const collegeStart = match.indexOf('"college":') + 10;
                const collegeEnd = match.indexOf(',', collegeStart);
                const college = match.substring(collegeStart, collegeEnd).replace(/"/g, "").trim();
                console.log("COLLEGE:"+college);

                //Leagues
                const leaguesStart = match.indexOf('"leagues":') + 10;
                const leaguesEnd = match.lastIndexOf('}') + 1;
                const leaguesSection = match.substring(leaguesStart, leaguesEnd).trim();
                
                const jerseyStart = leaguesSection.indexOf('"jersey":') + 9;
                const jerseyEnd = leaguesSection.indexOf(',', jerseyStart);
                const jersey = leaguesSection.substring(jerseyStart, jerseyEnd);
                
                const activeStart = leaguesSection.indexOf('"active":') + 9;
                const activeEnd = leaguesSection.indexOf(',', activeStart);
                const active = leaguesSection.substring(activeStart, activeEnd);
                
                const positionStart = leaguesSection.indexOf('"pos":') + 7;
                const positionEnd = leaguesSection.indexOf('"', positionStart);
                const position = leaguesSection.substring(positionStart, positionEnd).trim();

                const final= tablePlayerGenerator(birthDate,country,nbaStartYear,height,weight,college,jersey,active,position);
                return final;


            } catch (error) {
                console.error(error);
            }


        } catch (error) {
            console.error(error);
        }

}

function viewTableGenerator(yourname,pg,sg,sf,pf,c){
    let rosterTable =`<table style="border: 0.1rem solid;" >
        <tr>
            <th style="border: 0.1rem solid;">UserName</th>
            <th style="border: 0.1rem solid;">PG</th>
            <th style="border: 0.1rem solid;">SG</th>
            <th style="border: 0.1rem solid;">SF</th>
            <th style="border: 0.1rem solid;">PF</th>
            <th style="border: 0.1rem solid;">C</th>
        </tr>`;

    rosterTable+=`<tr>
        <td style="border: 0.1rem solid;">${yourname}</td>
        <td style="border: 0.1rem solid;">${pg}</td>
        <td style="border: 0.1rem solid;">${sg}</td>
        <td style="border: 0.1rem solid;">${sf}</td>
        <td style="border: 0.1rem solid;">${pf}</td>
        <td style="border: 0.1rem solid;">${c}</td>
    </tr>`

    return rosterTable;
}

function tableTeamGenerator(name,nickname,code,city,logo,allStar,conference,division){
    let teamTable =`<table style="border: 0.1rem solid;" >
        <tr>
            <th style="border: 0.1rem solid;">Name</th>
            <th style="border: 0.1rem solid;">Nickname</th>
            <th style="border: 0.1rem solid;">Code</th>
            <th style="border: 0.1rem solid;">City</th>
            <th style="border: 0.1rem solid;">Logo</th>
            <th style="border: 0.1rem solid;">AllStar</th>
            <th style="border: 0.1rem solid;">Conference</th>
            <th style="border: 0.1rem solid;">Division</th>

        </tr>`;

    teamTable+=`<tr>
        <td style="border: 0.1rem solid;">${name}</td>
        <td style="border: 0.1rem solid;">${nickname}</td>
        <td style="border: 0.1rem solid;">${code}</td>
        <td style="border: 0.1rem solid;">${city}</td>
        <td style="border: 0.1rem solid;">
            <img src="${logo}" alt="${nickname} Logo" style="width: 100px; height: auto;">
        </td>
        <td style="border: 0.1rem solid;">${allStar}</td>
        <td style="border: 0.1rem solid;">${conference}</td>
        <td style="border: 0.1rem solid;">${division}</td>
    </tr>`

    return teamTable;
}


function tablePlayerGenerator(birthDate,country,nbaStartYear,height,weight,college,jersey,active,position){

    let playerTable =`<table style="border: 0.1rem solid;" >
        <tr>
            <th style="border: 0.1rem solid;">Position</th>
            <th style="border: 0.1rem solid;">Height</th>
            <th style="border: 0.1rem solid;">Weight</th>
            <th style="border: 0.1rem solid;">NBA Start</th>
            <th style="border: 0.1rem solid;">Jersey</th>
            <th style="border: 0.1rem solid;">Birth Date</th>
            <th style="border: 0.1rem solid;">Country</th>
            <th style="border: 0.1rem solid;">College</th>
            <th style="border: 0.1rem solid;">Active</th>
        </tr>`;

    playerTable+=`<tr>
        <td style="border: 0.1rem solid;">${position}</td>
        <td style="border: 0.1rem solid;">${height}</td>
        <td style="border: 0.1rem solid;">${weight}</td>
        <td style="border: 0.1rem solid;">${nbaStartYear}</td>
        <td style="border: 0.1rem solid;">${jersey}</td>
        <td style="border: 0.1rem solid;">${birthDate}</td>
        <td style="border: 0.1rem solid;">${country}</td>
        <td style="border: 0.1rem solid;">${college}</td>
        <td style="border: 0.1rem solid;">${active}</td>
    </tr>`

    return playerTable;

}


const { MongoClient, ServerApiVersion } = require('mongodb');
async function init(cmd,yourname,pg,sg,sf,pf,c) {
    const client = new MongoClient(uri, {serverApi: ServerApiVersion.v1 });
    try {
        await client.connect();
        /* Inserting one student information */
        if(cmd==="addPlayers"){
            let player = {username:yourname,pg:pg,sg:sg,sf:sf,pf: pf,c:c };
            await insertApp(client, databaseAndCollection, player);
            
           
        }else if(cmd==="getUser"){
            let filter = {yourname};
            const cursor = client.db(databaseAndCollection.db)
            .collection(databaseAndCollection.collection)
            .find(filter);

            const result = await cursor.toArray();
            return result;

        }

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

async function insertApp(client, databaseAndCollection, players) {
    const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(players);
}

init().catch(console.error);

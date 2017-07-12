"use strict";function composeMail(a,b,c,d,e){var f=new helper.Content("text/html",d.message),g=d.firstname+" "+d.lastname,h=new helper.Mail(a,b,c,f);return h.personalizations[0].addSubstitution(new helper.Substitution("-name-",g)),h.personalizations[0].addSubstitution(new helper.Substitution("-firstname-",d.firstname)),h.personalizations[0].addSubstitution(new helper.Substitution("-email-",d.email)),h.setTemplateId(e),sg.emptyRequest({method:"POST",path:"/v3/mail/send",body:h.toJSON()})}function sendgridRequest(a,b){sg.API(a,function(a,c){if(200==c.statusCode||202==c.statusCode||201==c.statusCode)if(void 0==b){var d={attachments:[{fallback:"SendGrid Email Request Successful!",color:"#1BDB6C",pretext:"SendGrid Email Request Successful!",title:"SendGrid Email Request Successful!",text:"The SendGrid request has been sent. Below is the response from SendGrid.",fields:[{title:"Status Code",value:c.statusCode,"short":!0},{title:"Response Body",value:"```"+JSON.stringify(c.body)+"```","short":!1},{title:"Response Headers",value:"```"+JSON.stringify(c.headers)+"```","short":!1}]}]};slackPost(d,process.env.BDS_SLACK_WEBHOOK)}else b.attachments[0].fallback="SendGrid Contact Request Successful!",b.attachments[0].pretext="SendGrid Contact Request Successful!",b.attachments[0].title="SendGrid Contact Request Successful!",b.attachments[0].fields.push({title:"Status Code",value:c.statusCode,"short":!0},{title:"Response Body",value:"```"+JSON.stringify(c.body)+"```","short":!1},{title:"Response Headers",value:"```"+JSON.stringify(c.headers)+"```","short":!1}),slackPost(b,process.env.PREMUS_SLACK_WEBHOOK),slackPost(b,process.env.BDS_SLACK_WEBHOOK);else{var e={attachments:[{fallback:"SENDGRID REQUEST FAILED",color:"#C10039",pretext:"SENDGRID REQUEST FAILED!",title:"SENDGRID REQUEST FAILED!",text:"The response from SendGrid is displayed below for more information.",fields:[{title:"Status Code",value:c.statusCode,"short":!0},{title:"Response Body",value:"```"+JSON.stringify(c.body)+"```","short":!1},{title:"Response Headers",value:"```"+JSON.stringify(c.headers)+"```","short":!1}]}]};void 0!=b&&(e.attachments[0].text+="\nThis request is for the SendGrid Contacts API"),slackPost(e,process.env.PREMUS_SLACK_WEBHOOK),slackPost(e,process.env.BDS_SLACK_WEBHOOK)}console.log("--RESPONSE BEGIN--"),console.log(c.statusCode),console.log(c.body),console.log(c.headers),console.log("--RESPONSE END--\n")})}function sendgridContactRequest(a,b){sg.API(a,function(a,c){console.log("--RESPONSE BEGIN--"),console.log(c.statusCode),console.log(c.body),console.log(c.headers),console.log("--RESPONSE END--\n");var d="/v3/contactdb/lists/"+process.env.LIST_ID_MAILING+"/recipients/"+c.body.persisted_recipients[0],e=sg.emptyRequest({method:"POST",path:d});sendgridRequest(e,b)})}function slackPost(a,b){request({url:b,method:"POST",json:!0,body:a})}function googleSheets(a){authorize(function(b){var c={spreadsheetId:"1-AEh85B7NA-05DDWYe1dIqBdWwecBuJQqFWvxtUblvU",range:a.range,valueInputOption:"RAW",auth:b,resource:{majorDimension:"ROWS",values:a.values}};sheets.spreadsheets.values.append(c,function(a,b){if(a)return void console.log(a)})})}function authorize(a){if(null==oauth2Client)return void console.log("Google authentication failed");oauth2Client.setCredentials({refresh_token:process.env.GOOGLE_REFRESH_TOKEN}),oauth2Client.refreshAccessToken(function(a,b){a&&console.log(a)});var b=["https://www.googleapis.com/auth/drive.file","https://www.googleapis.com/auth/drive","https://www.googleapis.com/auth/spreadsheets"];oauth2Client.generateAuthUrl({access_type:"offline",scope:b});a(oauth2Client)}var moment=require("moment-timezone"),express=require("express"),request=require("request"),router=express.Router(),helper=require("sendgrid").mail,sg=require("sendgrid")(process.env.SENDGRID_API_KEY),google=require("googleapis"),googleAuth=google.auth.OAuth2,sheets=google.sheets("v4"),oauth2Client=new googleAuth(process.env.GOOGLE_CLIENT_ID,process.env.GOOGLE_CLIENT_SECRET,process.env.GOOGLE_REDIRECT_URL);router.get("/",function(a,b){b.set("Access-Control-Allow-Origin","*"),b.send("API v1 GET: Hello World!")}),router.post("/",function(a,b){b.set("Access-Control-Allow-Origin","*");var c=new Date,d=moment.tz(c,"America/Toronto").format();a.body.name=a.body.firstname+" "+a.body.lastname;var e=new helper.Email("info@medtechgateway.com","Medical Technologies Gateway"),f=new helper.Email("brandon@bdsdesign.co"),g=new helper.Email(a.body.email,a.body.name),h="New contact form submission on the MTG website!",i="Medical Technologies Gateway - Contact Form Submission Confirmation",j=composeMail(e,h,f,a.body,process.env.STORIES_MTG_TEMPLATE),k=composeMail(e,i,g,a.body,process.env.STORIES_USER_TEMPLATE),l={form:{attachments:[{fallback:"A new Featured Stories form on the MTG website has been submitted!",pretext:"A new Featured Stories form on the MTG website has been submitted!",title:"New Featured Stories Form Submission",text:"The contents of the form are outline below for reference.",fields:[{title:"First Name",value:a.body.firstname,"short":!0},{title:"Last Name",value:a.body.lastname,"short":!0},{title:"Email Address",value:a.body.email,"short":!1},{title:"Message",value:a.body.message,"short":!1},{title:"Added to mailing list?",value:"true"==a.body.mailinglist?"Yes":"No","short":!1}]}]},mailinglist:{attachments:[{fallback:"A new contact has subscribed to the mailing list!",color:"#1BDB6C",pretext:"A new contact has subscribed to the mailing list!",title:"New Contact Added to the Mailing List",text:"The new subscriber's information and upload status is outlined below.",fields:[{title:"First Name",value:a.body.firstname,"short":!0},{title:"Last Name",value:a.body.lastname,"short":!0},{title:"Email Address",value:a.body.email,"short":!1}]}]}};if(googleSheets({range:"Featured Stories Submissions!A2:D",values:[[d,a.body.name,a.body.email,a.body.message]]}),"true"==a.body.mailinglist){var m=sg.emptyRequest({method:"POST",path:"/v3/contactdb/recipients",body:[{email:a.body.email,first_name:a.body.firstname,last_name:a.body.lastname}]});sendgridContactRequest(m,l.mailinglist),googleSheets({range:"Mailing List!A2:C",values:[[a.body.firstname,a.body.lastname,a.body.email]]})}sendgridRequest(j,void 0),sendgridRequest(k,void 0),slackPost(l.form,process.env.PREMUS_SLACK_WEBHOOK),slackPost(l.form,process.env.BDS_SLACK_WEBHOOK),b.send(a.body)}),module.exports=router;
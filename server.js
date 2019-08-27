const express = require('express');
const con = require('./model/Db');
const mysql = require('mysql');
const session=require('express-session');

const app = express();

const redirectLogin= (request, response, next) => {
    if(!request.session.user)
    {
        response.render('index');
    }
    else{
        next();
    }
}

// caching disabled for every route//////////////////////////////
app.use(function(request, response, next) {
    response.set('Cache-Control', 'no-cache, private, no-store,must-revalidate,max-stale=0, post-check=0, pre-check=0');
    next();
});

app.listen(3000 , () => {
    console.log("Server Started....");
});


app.use(session({secret:"1234567"}))
//To serve Static Content
app.use(express.static('public'));

// //Configure view engine : hbs
// var path = require('path');
// app.set('views' , path.join(__dirname , 'views')); // Give Location
// //console.log(path.join(__dirname , 'views')); //To see path of file view
// app.set('view engine', 'hbs'); // Give Extension

var hbs= require('express-handlebars');
app.engine('hbs' , hbs({
    extname: 'hbs',
    defaultLayout: 'mainLayout',
    layoutsDir: __dirname + '/views/layouts/'
}));
app.set('view engine' , 'hbs');




//Configure body-parser
const bodyparser = require('body-parser');
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({
    extended:true
}));




app.get('/' , (request , response) => {
   response.render('index'); //Here Two doubts - (1)Extension, (2)location
});

app.get('/register', (request, response) => {
    response.render('registration');
});

app.get('/Login', (request, response) => {
    response.render('index');
});

app.get('/checkInbox', (request, response) => {
    if(request.session.user)
    {
        var sql="select * from mail where remail='"+request.session.user+"'";
        con.query(sql , (err , result) => {
            if(err) throw err;
            else
            {
                response.render('Inbox', {data: result , user:request.session.user,  profilepic: request.session.pic});
            }     
        });
    }
    else{
        response.render('index');
    }
});

app.get('/composeMail', redirectLogin, (request, response) => {
    response.render('Compose', {user:request.session.user, profilepic: request.session.pic});
});


app.get('/pwdChange', (request, response) => {
    if(request.session.user)
    {
        response.render('Changepwd' , {user:request.session.user, profilepic: request.session.pic});
    }
    else{
        response.render('index');
    }
});


app.get('/Home', (request, response) => {
    if(request.session.user)
    {
        response.render('home', {user:request.session.user});
    }
    else{
        response.render('index');
    }
});


app.get('/sentMails' , redirectLogin ,(request, response) => {
        var sql="select * from mail where semail='"+request.session.user+"'";

        con.query(sql , (err , result) => {
            if(err) throw err;
            else
            {
                response.render('Sentmail', {data: result, user:request.session.user,  profilepic: request.session.pic});
            }     
        });
});


app.get('/logout',(request,response)=>{
    request.session.destroy();
    response.render('index');
});


app.get('/DeleteSentMail', redirectLogin,(request,response)=>{
    var mailid= request.query.mid;                          //Query String
    var sql="delete from mail where mailid ="+mailid;
    con.query(sql,(err)=>{
        if(err) throw err;
        else
        {
            var sql="select * from mail where semail='"+request.session.user+"'";
            con.query(sql,(err,result)=>{
                if(err) throw err;
                else{
                    response.render('Sentmail',{data:result , msg:"Mail Deleted Successfully" , user:request.session.user}); 
                }
            });
        }
    });
});

app.get('/DeleteInboxMail',(request,response)=>{
    if(request.session.user)
    {
        var mailid= request.query.mid;                          //Query String
        var sql="delete from mail where mailid ="+mailid;
        con.query(sql,(err)=>{
            if(err) throw err;
            else
            {
                var sql="select * from mail where remail='"+request.query.user+"'";
                con.query(sql,(err,result)=>{
                    if(err) throw err;
                    else
                    response.render('Inbox',{data:result , msg:"Mail Deleted Successfully" , user:request.session.user}); 
                });
            }
        });
    }
    else{
        response.render('index');
    }
});


const upload = require('express-fileupload');
app.use(upload());

app.post('/insertRecord' , (request , response) =>{
    console.log(request.files);
    if(request.files)
    {
        var uname = request.body.uname;
        var email = request.body.email;
        var password = request.body.password;
        var random= Math.random().toString(36).slice(-8);

        var alldata = request.files.file;
        var filename = alldata.name;
        var altfname = random + filename;

        alldata.mv('./public/upload/'+altfname, (err) =>{
            if(err) throw err;
            else
            {
                var sql = "insert into user values(?,?,?,?)";
                var inputs = [uname, email , password, altfname];
                sql = mysql.format(sql , inputs);
                con.query(sql , (err)=>{
                    if(err) throw err;
                    else
                        response.render('registration' , {msg: 'Registered Successfully. Now Please Sign-In'});
                });
            }
        });
    }
});

app.post('/loginCheck' , (request , response) =>{
    var email = request.body.email;
    var password = request.body.password;

    var sql = "select * from user where email=? and password=?";
    var inputs = [email , password];
    sql = mysql.format(sql , inputs);
    con.query(sql , (err,result)=>{
        if(err) throw err;
        else if(result.length > 0)
        {
            request.session.user=email;
            request.session.pic = result[0].profilepic;
            response.render('home' , {user:request.session.user , profilepic: request.session.pic});
        }
        else
            response.render('index' , {msg: 'Login Fail'});
    });
});

app.post('/MailSent' , (request , response) =>{
    var semail = request.body.semail;
    var remail = request.body.remail;
    var subject = request.body.subject;
    var message = request.body.message;

    var sql = "insert into mail(semail , remail , subject, message) values(?,?,?,?)";
    var inputs = [semail , remail , subject, message];
    sql = mysql.format(sql , inputs);
    con.query(sql , (err)=>{
        if(err) throw err;
        else
            response.render('Compose' , {msg: 'Mail Sended successfully..'});
    });
});


//  Without From Field
// app.post('/MailSent' , (request , response) =>{
//     var remail = request.body.remail;
//     var subject = request.body.subject;
//     var message = request.body.message;

//     var sql = "insert into mail(semail , remail , subject, message) values(?,?,?,?)";
//     var inputs = [request.session.user , remail , subject, message];
//     sql = mysql.format(sql , inputs);
//     con.query(sql , (err)=>{
//         if(err) throw err;
//         else
//             response.render('Compose' , {msg: 'Mail Sended successfully..'});
//     });
// });






app.post('/Changepwd' , (request , response) =>{

    
    var newpassword = request.body.newpassword;
    var oldpassword = request.body.oldpassword
 
    var sql = "select * from user where email=? and password=?";
    var inputs = [request.session.user , oldpassword];
    sql = mysql.format(sql , inputs);
    con.query(sql , (err,result)=>{
        if(err) throw err;
        else if(result.length > 0)
        {

            var sql = "update user SET password = ? where password=? and email='"+request.session.user+"'";
            var inputs = [newpassword , oldpassword];
            sql = mysql.format(sql , inputs);
            con.query(sql , (err)=>{
                if(err) throw err;
                else
                    response.render('Changepwd' , {success: 'Password Changed Successfully. To check please logout and login again' , user:request.session.user});
            });
        

        }
        else
            response.render('Changepwd' , {Fail: 'Current password is wrong'});
    });

});


app.use(function(request , response){
    response.status(404);
    response.render('404',{title : '404: Requested Page Not Found'});
});
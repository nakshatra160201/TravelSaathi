const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
var session = require('express-session');
const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator');
const axios = require('axios');
const https = require('https');
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
require('dotenv').config();
app.use(session({
    secret: process.env.SECRET,
    name: process.env.NAME
    , saveUninitialized: false
}));


//database connections

mongoose.connect("mongodb+srv://naksh160201:" + process.env.DB_PASS + "@nakshatracluster.qrbdl.mongodb.net/TravelSaathiDB?retryWrites=true&w=majority", { useNewUrlParser: true, useUnifiedTopology: true });

mongoose.set("useCreateIndex", true);

//user schema
const usersSchema = new mongoose.Schema({
    name: { type: String, required: true },
    gender: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date }
});





const destSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    distance: { type: Number },
    duration: { type: Number },
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String },
    time: { type: String },
    date: { type: String }

});


const User = new mongoose.model("User", usersSchema);
const Dests = new mongoose.model("Dests", destSchema);



//nodemailer transporter
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.TS_U,
        pass: process.env.TS_P
    }
});



//routes
app.get('/myResults', (req, res) => {
    Dests.findOne({ email: req.session.username }, function (err, found) {
        if (err) {
            console.log(err);
        }
        else {
            Dests.find({ email: { $ne: req.session.username } }, function (err1, docs) {
                if (!err1) {
                    const finalizer = async () => {
                        var final_ans = [];
                        for (var i = 0; i < docs.length; i++) {
                            const sendGetRequest = async () => {
                                const ap1 = 'https://router.hereapi.com/v8/routes?transportMode=car&origin=' + found.latitude + ',' + found.longitude + '&destination=' + docs[i].latitude + ',' + docs[i].longitude + '&return=summary&apikey=xy-JA4o4QQnElMZBtk1JjRfZMUPbxooRO2rXJFkXcCo';
                                try {
                                    const resp = await axios.get(ap1);
                                    return resp.data;
                                } catch (err) {
                                    console.error(err);
                                }
                            };
                            const waiter = async (docs, found, i) => {
                                await sendGetRequest().then(x => {
                                    var api_dist = x.routes[0].sections[0].summary.length;
                                    var api_duration = x.routes[0].sections[0].summary.duration;
                                    var disttol1 = found.distance + api_dist - docs[i].distance;
                                    var disttol2 = found.distance - api_dist - docs[i].distance;
                                    if (disttol1 < 0)
                                        disttol1 = -disttol1;
                                    if (disttol2 < 0)
                                        disttol2 = -disttol2;

                                    var timetol1 = found.duration + api_duration - docs[i].duration;
                                    var timetol2 = found.duration - api_duration - docs[i].duration;
                                    if (timetol1 < 0)
                                        timetol1 = -timetol1;
                                    if (timetol2 < 0)
                                        timetol2 = -timetol2;
                                    if (timetol1 <= 600 || timetol2 <= 600 || disttol1 <= 5000 || disttol2 <= 5000) {
                                        console.log(docs[i].email);
                                        final_ans.push(docs[i].email);
                                    }
                                    else {
                                        console.log("np");
                                    }


                                });
                            }
                            await waiter(docs, found, i);
                        }
                            return final_ans;
                    }
                    finalizer().then(final => {
                        res.send(final);
                        //
                        // var returner={};
                        // for(var i=0;i<final.length;i++){
                        //     User.findOne({ email: final[i] }, function (err, found) {
                        //         if (err) {
                        //             console.log(err);
                        //         }
                        //         else {
                        //             if (found) {
                        //                 if (found.password === req.body.password) {
                        //                     req.session.loggedIn = true;
                        //                     req.session.username = req.body.username;
                        //                     res.send("logged in");
                        //                     //res.redirect('/');
                        //                 }
                        //                 else {
                        //                     res.send("wrong pass");
                        //                 }
                        //             }
                        //             else {
                        //                 res.send("register yourself");
                        //             }
                        //         }
                        //     });

                        // }




                    });
                }
                else
                    console.log(err1);
            });
        }
    });
});
app.post('/results', (req, res) => {
    const ap1 = 'https://geocode.search.hereapi.com/v1/geocode?q=' + req.body.address + '&apikey=xy-JA4o4QQnElMZBtk1JjRfZMUPbxooRO2rXJFkXcCo';
    const sendGetRequest = async () => {
        try {
            const resp = await axios.get(ap1);
            //console.log(resp.data);
            return resp.data;
        } catch (err) {
            // Handle Error Here
            console.error(err);
        }
    };
    sendGetRequest().then(x => {
        var ob1 = x;
        console.log(x.items[0]);
        const ap2 = 'https://router.hereapi.com/v8/routes?transportMode=car&origin=' + 30.56249 + ',' + 76.89828 + '&destination=' + x.items[0].position.lat + ',' + x.items[0].position.lng + '&return=summary&apikey=xy-JA4o4QQnElMZBtk1JjRfZMUPbxooRO2rXJFkXcCo';
        //res.send(ob1.items[0]);
        //res.write(ob1.items[0]);
        //console.log(ob1.items[0]);
        const sendGetRequest1 = async () => {
            try {
                const resp = await axios.get(ap2);
                //console.log(resp.data);
                return resp.data;
            } catch (err) {
                // Handle Error Here
                //console.error(err);
            }
        };

        sendGetRequest1().then(y => {
            var ob2 = y;
            //console.log(ob2.items[0])
            var ob3 = { ...ob1, ...ob2 };
            //res.send(ob2.routes[0].sections[0].summary);



            const dest = new Dests({
                email: req.session.username,
                distance: ob3.routes[0].sections[0].summary.length,
                duration: ob3.routes[0].sections[0].summary.duration,
                latitude: ob3.items[0].position.lat,
                longitude: ob3.items[0].position.lng,
                address: req.body.address,
                time: req.body.time,
                date: req.body.date
            });
            dest.save(function (err) {
                if (!err) {
                    console.log('added to DB');
                    // res.send(ob3);
                    res.redirect('/myResults');
                }
                else {
                    console.log('error in DB');
                    res.send('ERROR');
                }
            });
        });
    });
});



// app.post('/plantrip', (req, res) => {


//     User.findOne({ email: req.session.username }, function (err, found) {
//         if (err) {
//             console.log(err);
//         }
//         else {
//             if (!found) {
//                 const dest = new Dests({
//                     email: req.session.username,
//                    date:req.body.date,
//                    address:req.body.addrs,
//                    time:req.body.time,

//                 });
//                 user.save(function (err) {
//                     if (!err) {

//                         var mailOptions = {
//                             from: 'travelsaathi21@gmail.com',
//                             to: req.body.email,
//                             subject: 'Successful registration with travelsaathi.com',
//                             text: 'Congrats! you are successfully registered with username ' + req.body.email
//                         };

//                         transporter.sendMail(mailOptions, function (error, info) {
//                             if (error) {
//                                 console.log(error);
//                             } else {
//                                 console.log('Email sent: ' + info.response);
//                                 res.redirect('/');
//                             }
//                         });

//                     }
//                     else {
                        
//                         res.send('phone number is already registered with other userID.');
//                     }
//                 });
                   
//             }
//             else {
//                 res.send("trip already exists");
//             }
//         }
//     });



    
// })






app.get('/', (req, res) => {

    if (!req.session.loggedIn)
        res.render('login');
    else
        // res.send("already logged in .. logout using /logout");
        res.render("index");
})

app.post('/authenticate', (req, res) => {
    User.findOne({ email: req.body.username }, function (err, found) {
        if (err) {
            console.log(err);
        }
        else {
            if (found) {
                if (found.password === req.body.password) {
                    req.session.loggedIn = true;
                    req.session.username = req.body.username;
                    //res.send("logged in");
                    //res.redirect('/');
                    res.render("index");
                }
                else {
                    res.send("wrong pass");
                }
            }
            else {
                res.send("register yourself");
            }
        }
    });
});


app.get('/forgot', (req, res) => {
    if (!req.session.loggedIn)
        res.render('forgotpassword');
});

app.post('/reset', (req, res) => {

    User.findOne({ email: req.body.username }, function (err, found) {
        if (err) {
            console.log(err);
        }
        else {
            if (found) {
                found.resetPasswordToken = String(otpGenerator.generate(6));
                found.resetPasswordExpires = Date.now() + 300000; // 5 min in ms
                found.save(function (err) {
                    if (!err) {
                        console.log("saved success");
                    }
                    else {
                        res.send('try later ');
                    }
                });



                var mailOptions = {
                    from: 'travelsaathi21@gmail.com',
                    to: found.email,
                    subject: 'Password reset for travelsaathi.com',
                    text: 'Someone requested to change the password for travelsaathi.com account with username: ' + found.email + ' .If it wasnt you then dont worry ,your password will remain unchanged. Dont share this OTP with anyone . This OTP will remain valid for 5 minutes OTP: ' + found.resetPasswordToken
                };

                transporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                        console.log(error);
                    } else {
                        req.session.forgotuname = found.email;
                        console.log('Email sent: ');
                        res.render('OTP');
                    }
                });
            }
            else {
                res.send("not registered");
            }
        }
    });

});

app.post('/checkotp', (req, res) => {

    User.findOne({ email: req.session.forgotuname }, function (err, found) {
        if (err) {
            console.log(err);
        }
        else {
            if (found) {
                if (found.resetPasswordToken === req.body.otp && found.resetPasswordExpires > Date.now()) {
                    found.password = req.body.passw;

                    found.save(function (err) {
                        if (!err) {
                            console.log("saved success");

                            var mailOptions = {
                                from: 'travelsaathi21@gmail.com',
                                to: req.session.forgotuname,
                                subject: 'Password changed successfully',
                                text: 'Your password was changed successfully.'
                            };

                            transporter.sendMail(mailOptions, function (error, info) {
                                if (error) {
                                    console.log(error);
                                } else {
                                    req.session.forgotuname = found.email;
                                    console.log('Email sent: ' + info.response);
                                    res.redirect('/');
                                }
                            });

                        }
                        else {
                            res.send('wrong otp');
                        }
                    });
                }
                else {
                    res.send('ERROR 404');
                }
            }
            else {
                res.send("no such user");
            }
        }
    });

});

app.get('/logout', (req, res) => {
    //req.session.destroy((err)=>{})
    req.session.loggedIn = false;
    //res.send('Thank you! Visit again')
    res.redirect('/');
});
// app.get('/adder',(req, res)=>{
//     const ele = new Ele({
//         topic: "algebra",
//         subtopic:"operations",
//         tid: "2",
//     });
//     ele.save();


// });


app.post('/signup', (req, res) => {

    User.findOne({ email: req.body.email }, function (err, found) {
        if (err)
            console.log(err);
        else {
            if (!found) {

                const user = new User({
                    name: req.body.name,
                    gender: req.body.gender,
                    email: req.body.email,
                    password: req.body.psw,
                    phone: req.body.phone
                });
                user.save(function (err) {
                    if (!err) {

                        var mailOptions = {
                            from: 'travelsaathi21@gmail.com',
                            to: req.body.email,
                            subject: 'Successful registration with travelsaathi.com',
                            text: 'Congrats! you are successfully registered with username ' + req.body.email
                        };

                        transporter.sendMail(mailOptions, function (error, info) {
                            if (error) {
                                console.log(error);
                            } else {
                                console.log('Email sent: ' + info.response);
                                res.redirect('/');
                            }
                        });

                    }
                    else {
                        
                        res.send('phone number is already registered with other userID.');
                    }
                });

            }
            else {
                res.send("username taken");
            }
        }
    });
});

app.listen(process.env.PORT || 3000, function () {
    console.log("Started");
})

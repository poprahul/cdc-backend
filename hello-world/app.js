const PDFDocument = require('pdfkit');
const fs = require("fs");
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const ses = new AWS.SES({ region: "us-east-1" });
const ddb = new AWS.DynamoDB.DocumentClient();
const uuidv4 = require('uuid/v4')
const nodemailer = require('nodemailer');

let response;


function getS3File(bucket, key) {
    return new Promise(function (resolve, reject) {
        s3.getObject(
            {
                Bucket: bucket,
                Key: key
            },
            function (err, data) {
                if (err) return reject(err);
                else return resolve(data);
            }
        );
    })
}

function addHorizontalRule(doc, spaceFromEdge = 0, linesAboveAndBelow = 0.5) {
    doc.moveDown(linesAboveAndBelow);
  
    doc.moveTo(0 + spaceFromEdge, doc.y)
      .lineTo(doc.page.width - spaceFromEdge, doc.y)
      .stroke();
  
    doc.moveDown(linesAboveAndBelow);
    
    return doc
  }
  

exports.lambdaHandler = async (event, context, callback) => {
    console.log("EVENT: \n" + JSON.stringify(event, null, 2))

    let payload;
    let email;
    let firstName;
    let lastName;
    let fullName;
    let dob;

    const consentText = 'Our goal is to provide a safe environment for our patients and staff, and to advance the safety of our local community. This document provides information we ask you to acknowledge and understand regarding the COVID‐19 virus. The COVID‐19 virus is a serious and highly contagious disease. The World Health Organization has classified it as a pandemic. You could contract COVID‐19 from a variety of sources. Our practice wants to ensure you are aware of the additional risks of contracting COVID‐19 associated with dental care. The COVID‐19 virus has a long incubation period. You or your healthcare providers may have the virus and not show symptoms and yet still be highly contagious. Determining who is infected by COVID‐19 is challenging and complicated due to limited availability for virus testing. Due to the frequency and timing of visits by other dental patients, the characteristics of the virus, and the characteristics of dental procedures, there is an elevated risk of you contracting the virus simply by being in a dental office. Dental procedures create water spray which is one way the disease is spread. The ultra‐fine nature of the water spray can linger in the air for a long time, allowing for transmission of the COVID‐19 virus to those nearby. You cannot wear a protective mask over your mouth to prevent infection during treatment as your health care providers need access to your mouth to render care. This leaves you vulnerable to COVID‐19 transmission while receiving dental treatment. Pursuant to statements from the Center for Disease Control (CDC) and the American Dental Association (ADA), non‐essential or elective treatment, based on the assessment of our staff, will be rescheduled. According to the ADA, dental emergencies are “potentially life threatening and require immediate treatment to stop ongoing tissue bleeding [or to] alleviate severe pain or infection.” The ADA also recommends that urgent dental care which “focuses on the management of conditions that require immediate attention to relieve severe pain and/or risk of infection and to alleviate the burden on hospital emergency departments” be provided in as minimally invasive a manner as possible. I confirm that I have read the Notice above and understand and accept that there is an increased risk of contracting the COVID‐19 virus in the dental office or with dental treatment. I further confirm I am seeking treatment for a condition that meets the emergent or '
     + 'criteria noted above. I understand and accept the additional risk of contracting COVID‐19 from contact at this office. I also acknowledge that I could contract the COVID‐19 virus from outside this office and unrelated to my visit here.';
    
    try {
        payload = JSON.parse(event.body);
        email = payload.email;
        firstName = payload.firstName;
        lastName = payload.lastName;
        fullName = firstName + ' ' + lastName;
        dob = payload.dob;
        console.log("Fname="+ firstName);
        console.log("Lname="+ lastName);
    } catch (err) {
        console.log('Error: ', err.message);
    }

    let bucketName = 'poprahul-demos';
    let bucketKey = firstName + "_" + lastName + ".pdf";

    try {
        // creating and writing a pdf file to /tmp
        let doc = new PDFDocument({size: 'A4'});
        // let fileName = "yourfile.pdf";
        let fileNameS3 = bucketKey;

    
        //We use Lambdas temp folder to store file temporarily.
        //When Lambda execution ends temp is flushed
        let file = fs.createWriteStream("/tmp/" + fileNameS3);
    
        doc.pipe(file);
        // doc.text("hello", { align: 'center'});

        /* sameple text
        doc
            .font('Courier')
            .fontSize(25)
            .text('Some text with an embedded font!', 100, 100);
        */

        // Headers
        doc.lineGap(5)
        doc.fontSize(20).fillColor('red')
        doc.text("Children's Dental Care", { align: 'center' });
        addHorizontalRule(doc, 5);
        doc.text("Corona Virus Screening Questionnaire", { align: 'center' }).moveDown(1.0)

        // Personal Details
        doc.fontSize(15).fillColor('black')
        doc.font('Courier-Bold').text("Email");
        doc.font('Courier').text(payload.email).moveDown(0.5);
        doc.font('Courier-Bold').text("Name");
        doc.font('Courier').text(fullName).moveDown(0.5);
        doc.font('Courier-Bold').text("Date of birth");
        doc.font('Courier').text(new Date(payload.dob).toISOString().split('T')[0]).moveDown(0.5);

        // Consent + Covid Questionnaire
        doc.font('Courier-Bold').text("Do you/they have fever or have you/they felt hot or feverish recently (14-21 days)?");
        doc.font('Courier').text(payload.q1).moveDown(0.5);
        doc.font('Courier-Bold').text("Are you/they having shortness of breath or other difficulties breathing?");
        doc.font('Courier').text(payload.q2).moveDown(0.5);
        doc.font('Courier-Bold').text("Do you/they have a cough?");
        doc.font('Courier').text(payload.q3).moveDown(0.5);
        doc.font('Courier-Bold').text("Any other flu-like symptoms, such as gastrointestinal upset, headache or fatigue?");
        doc.font('Courier').text(payload.q4).moveDown(0.5);
        doc.font('Courier-Bold').text("Have you/they experienced recent loss of taste or smell?");
        doc.font('Courier').text(payload.q5).moveDown(0.5);
        doc.font('Courier-Bold').text("Are you/they in contact with any confirmed COVID-19 positive patients?");
        doc.font('Courier').text(payload.q6).moveDown(0.5);
        doc.font('Courier-Bold').text("Is your/their age over 60?");
        doc.font('Courier').text(payload.q7).moveDown(0.5);
        doc.font('Courier-Bold').text("Do you/they have heart disease, lung disease, kidney disease, diabetes or any auto-immune disorders?");
        doc.font('Courier').text(payload.q8).moveDown(0.5);
        doc.font('Courier-Bold').text("Have you/they traveled in the past 14 days to any regions affected by COVID-19? (as relevant to your location)");
        doc.font('Courier').text(payload.q9).moveDown(0.5);
        doc.font('Courier-Bold').text("Have you been tested positive to COVID-19?");
        doc.font('Courier').text(payload.q10).moveDown(0.5);
        doc.font('Courier-Bold').text("Patients who are well but who have a sick family member at home with COVID-19 should consider postponing elective treatment. Positive responses to any of these would likely indicate a deeper discussion with the dentist before proceeding with elective dental treatment.").moveDown(0.5);
        
        // Consent text
        doc.font('Courier-Bold').text("COVID-19 Treatment Consent Form").moveDown(0.25);
        doc.font('Courier').text(`${consentText}`, {
            width: 410,
            align: 'justify',
            lineBreak: true
          }
        ).moveDown(1.0);   

        // Signature
        doc.font('Courier-Bold').text('Signature of Patient or Legal Guardian')
        let base64ImageStr = payload.sign;
        let base64Sign = base64ImageStr.split(';base64,').pop();

        // const buffer = Buffer.from(base64ImageStr, "base64");
        // fs.writeFileSync("new-path.jpg", buffer);
        // OR
        let imgFullPath = "/tmp/sign_" + fileNameS3 + ".png";
        await new Promise(resolve => {
            fs.writeFile(imgFullPath, base64Sign, {encoding: 'base64'}, function(err) {
                console.log('Signature file created for '+ fileNameS3);
                resolve();
            });
        });

        // doc.image('cake.jpg', {height: 100, width: 100});
        doc.image(imgFullPath, {
            fit: [100, 100],
            align: 'center',
            valign: 'center'
        });

        doc.moveDown(10);
        doc.font('Courier-Bold').text("Today's Date");
        let currentDate = new Date();
        doc.font('Courier').text(currentDate.getMonth()+1 +"/"+ currentDate.getDate() +"/"+ currentDate.getFullYear()).moveDown(0.5);
        // doc.font('Courier').text(new Date().toISOString().split('T')[0]).moveDown(0.5);

        // # Finalize PDF file 
        doc.end();
        
        // finish writing pdf file
        await new Promise(resolve => {
            file.on("finish", function() {
                console.log("Finished writing pdf file to /tmp folder");
                resolve();
            });
        });
       
        // uploading pdf file to s3
        // file.on("finish", function () {
            // reading the new pdf file back from /tmp and writing it to s3
            const stats = fs.statSync("/tmp/" + fileNameS3);
            console.log("filesize: " + stats.size);
            console.log("starting s3 putObject");

            var s3Params = {
                Bucket: bucketName,
                Key: fileNameS3,
                Body: fs.createReadStream("/tmp/" + fileNameS3),
                ContentType: "application/pdf",
                ContentLength: stats.size
            }

            try {
                console.log('file upload started')
                const uploadResult = await s3.putObject(s3Params).promise();
                // await s3.putObject(s3Params, function (err, data) {
                //     if (err) {
                //         console.log(err, err.stack);
                //     } else {
                //         console.log("file upload finished " + data);
                //     }
                // });
                console.log("uploadResult="+ uploadResult);
            } catch (err) {
                console.log(err)
            };
            
            console.log("finished s3 putObject try catch " + fileNameS3);

            // read the pdf file from the s3 bucket and send it as an attachment using ses
            let getS3Response = await getS3File(bucketName, bucketKey)
                .then(async function (fileData) {
                    console.log("bucketName=" + bucketName);
                    console.log("bucketKey=" + bucketKey);
                    console.log("fileNameS3=" + fileNameS3);
                    var mailOptions = {
                        from: 'poprahul@amazon.com',
                        subject: 'Demo: Covid Questionnaire for ' + fullName,
                        text: 'Please find attached the covid-19 questionaire for ' + fullName,
                        to: 'rahul.popat@gmail.com',
                        // bcc: Any BCC address you want here in an array,
                        attachments: [
                            {
                                filename: fileNameS3,
                                content: fileData.Body
                            }
                        ]
                    };
                    console.log('Got attachment from S3');

                    // create Nodemailer SES transporter
                    var transporter = nodemailer.createTransport({
                        SES: ses
                    });
                    console.log('Created SES transporter');

                    // send email
                    // transporter.sendMail(mailOptions, function (err, info) {
                    //     console.log('Sending SES email...');
                    //     if (err) {
                    //         console.log(err);
                    //         console.log('Error sending email');
                    //         callback(err);
                    //     } else {
                    //         console.log('Email sent successfully');
                    //         callback();
                    //     }
                    // });
                    // sync way of doing it. Make sure to add async in front of 'function (fileData)' call
                    let result = await transporter.sendMail(mailOptions)
                    console.log("Result:", result);
                }).catch(function (error) {
                        console.log(error);
                        console.log('Error getting attachment from S3 OR sending Email');
                        callback(err);
                });
                
                console.log("getS3Response = " + getS3Response);
                console.log("Email Sent");

            // send email - raw without attachment (old)
            /*
            var sesParams = {
                Destination: {
                    ToAddresses: ["rahul.popat@gmail.com"]
                },
                Message: {
                    Body: {
                        Text: { Data: JSON.stringify(payload)
                        }
                    },
                    Subject: { Data: "CDC Information Received for " + firstName + " " + lastName
                    }
                },
                Source: "poprahul@amazon.com"
            };
                    
            ses.sendEmail(sesParams, function (err, data) {
                if (err) {
                    console.log(err);
                    context.fail(err);
                } else {
                    console.log(data);
                    context.succeed(event);
                }
            });
            */

            // save key info in database
            var idd = uuidv4()
            var ddbParams = {
                TableName: 'CDCTable',
                Item: {
                    "id": idd, 
                    "payload": email + '|' + firstName + '|' + lastName + '|' + dob + '|' + fileNameS3
                },
            }

            /* disable ddb for testing */
            let ddbResponse = await ddb.put(ddbParams).promise();
            console.log("ddbResponse="+ ddbResponse.ReturnValues);

            // await new Promise(resolve => setTimeout(resolve, 5000));

            // send response back to the client
            const responseHeaders = {
                'Content-Type': 'application/json',
                "Access-Control-Allow-Headers" : "Content-Type",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE",
            };

            response = {
                'statusCode': 200,
                'body': JSON.stringify({
                    // message: 'hello world',
                    data: 'Information saved successfully!',
                }),
                'headers': responseHeaders
            }
        // });
    } catch (err) {
        console.log(err);
        return err;
    }

    return response
};

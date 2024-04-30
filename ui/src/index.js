import { createRoot } from 'react-dom/client';
import {useState, useEffect} from 'react';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { ListTablesCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {nanoid} from 'nanoid';

const s3client = new S3Client({
    credentials: {
        accessKeyId: process.env.REACT_APP_ACCESSKEYID,
        secretAccessKey: process.env.REACT_APP_SECRETACCESSKEY,
    },
    region: process.env.REACT_APP_REGION
});

const dynamoclient = new DynamoDBClient({
    credentials: {
        accessKeyId: process.env.REACT_APP_ACCESSKEYID,
        secretAccessKey: process.env.REACT_APP_SECRETACCESSKEY,
    },
    region: process.env.REACT_APP_REGION
});


// Taken from https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
async function putData(url = "", data = {}) {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });
    return response;//.json();
}

function InputForm() {
    const [textInput, setTextInput] = useState('');
    const [fileInput, setFileInput] = useState({});

    const submitForm = async (e) => {
        e.preventDefault();
        if (!fileInput.name || textInput.length === 0) {
            alert("You must provide text input and a file. Try again.");
            return;
        }
        const s3input = {
            "Body": fileInput,
            "Bucket": process.env.REACT_APP_BUCKETNAME,
            "Key": fileInput.name,//process.env.REACT_APP_KEY,
        }
        const putobject = new PutObjectCommand(s3input);
        // needs error handling. using let makes variable addr reusable.
        // What happens when the user presses enter instead of clicking?
        // How are user input failures handled gracefully?
        // Implementing the following nested if statements to handle these
        // conditions will make the application usable.
        let response = await s3client.send(putobject);
        // error handle on the response
        // I need to make an error handling function to reuse. If there is time, I will.
        console.log(response);
        if (response.$metadata.httpStatusCode === 200) {
            alert("Successfully uploaded file.");
            
            // get the table 'FileTable' from dynamodb and upload the data.
            const listtables = new ListTablesCommand({});
            response = await dynamoclient.send(listtables);
            if (response.$metadata.httpStatusCode === 200) {
                 // save the inputs and S3 path in dynamodb FileTable via api and lambda fn.
                const filetabledata = {
                    "id": nanoid(),
                    "input_text": textInput,
                    "input_file_path": String(process.env.REACT_APP_BUCKETNAME)+"/"+fileInput.name,
                };
                let res = await putData("https://mo4ck0e57a.execute-api.us-east-2.amazonaws.com/send_to_dynamo",filetabledata);
                console.log(res);
                alert("put item in dynamodb using lamda");
            } else {
                alert("error performing dynamodb operations.");
                return;
            }
            return;
        } else {
            alert("Error uploading the file. Try again.");
        }
    }

    const handleTextInputChange = (e) => {
        e.preventDefault();
        setTextInput(e.target.value);
    }

    const handleFileChange = async (e) => {
        e.preventDefault();
        let raw_file = e.target.files[0];
        // should use typescript here. nametype annotations will do as well.
        let file_array = raw_file.name.split('.');
        // set the name of the [FileInput] and set the extension to '.txt'
        let file_name = file_array[0] + '.txt';
        let file_text = await raw_file.text();
        let file = new File([file_text], file_name);
        let file_size = file.size;
        setFileInput(file);
    }

    return (
        <form action="" method="get" className="">
            <div>
                <label htmlFor="text-input">Text input: </label>
                <input type="text" name="text-input" id="text-input" 
                    onChange={handleTextInputChange} required />
            </div>
            <div>
                <label htmlFor="file-input">File input: </label>
                <input type="file" name="file-input" id="file-input" 
                    onChange={handleFileChange} required />
            </div>
            <div>
                <input type="submit" value="Submit" onClick={submitForm} />
            </div>
        </form>
    );
}

const root = createRoot(document.getElementById('app'));

root.render(<InputForm />);


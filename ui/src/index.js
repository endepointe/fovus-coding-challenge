import { Auth0Provider } from '@auth0/auth0-react';
import { useAuth0 } from "@auth0/auth0-react";
import { fromWebToken, fromHttp } from "@aws-sdk/credential-providers"
import { createRoot } from 'react-dom/client';
import {useState, useEffect} from 'react';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { ListTablesCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {nanoid} from 'nanoid';
[]
// Auth0 requires an enterprise account. This requiremnt is not satisfied. 
// This is doable though, just not on my budget. I would like to learn  how to 
// use other OIDC providers.
/*
const token = await getIdTokenClaims();
console.log(token.__raw);
const s3client = new S3Client({
    region: process.env.REACT_APP_REGION,
    credentials: fromWebToken({
        roleArn: "insert role if I had an auth0 enterprise account",
        webIdentityToken: token.__raw,
    }),
});
*/
// Instead, I keep the .env vars out of the repo.
const s3client = new S3Client({
    credentials: {
        accessKeyId: process.env.REACT_APP_ACCESSKEYID,
        secretAccessKey: process.env.REACT_APP_SECRETACCESSKEY,
    },
    region: process.env.REACT_APP_REGION,
});

// Taken from https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
async function postData(url = "", data = {}) {
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });
        console.log(response);
        return response.json();
    } catch (error) {
        console.error("Error:", error);
    }
}

function InputForm() {
    const [textInput, setTextInput] = useState('');
    const [fileInput, setFileInput] = useState({});
    const { user, isAuthenticated, isLoading, loginWithRedirect, 
        getIdTokenClaims,
        getAccessTokenSilently } = useAuth0();

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
        console.log(response);

        // error handle on the response
        // I need to make an error handling function to reuse. If there is time, I will.
        
        if (response.$metadata.httpStatusCode === 200) {
            alert("Successfully uploaded file.");

            // save the inputs and S3 path in dynamodb FileTable via api and lambda fn.
            const filetabledata = {
                "id": nanoid(),
                "input_text": textInput,
                "input_file_path": String(process.env.REACT_APP_BUCKETNAME)+"/"+fileInput.name,
            };
            let senddynamo = await postData(process.env.REACT_APP_API_SENDTODYNAMO,filetabledata);
            console.log(senddynamo);

            let runinstance = await postData(process.env.REACT_APP_API_RUNINSTANCE, null);

            let id = JSON.parse(runinstance).value;
            console.log(id);
            alert("send script to instance id:"+JSON.parse(runinstance).value);
            alert("enter: aws s3 cp <scriptname> s3://<bucketname>");

            //let terminstance = await postData(process.env.REACT_APP_API_TERMINATEINSTANCE, {"instanceID": id});

            //console.log(terminstance);

            alert("put item in dynamodb using lamda.terminate instance.");

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

    if (!user) {
        return (
            <div>
                <p>Please log in to upload files.</p>
                <button onClick={() => loginWithRedirect()}>Log in</button>
            </div>
        );
    }

    return isAuthenticated && (
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

root.render(
    <Auth0Provider
        domain="endeadmin.us.auth0.com"
        clientId="4Vcjycvm24cxitAzH2lIsgWMTtKD9Zas"
        authorizationParams={{
        redirect_uri: window.location.origin
    }}
    >
        <InputForm />
    </Auth0Provider>,
);

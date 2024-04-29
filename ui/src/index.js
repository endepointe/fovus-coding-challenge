import { createRoot } from 'react-dom/client';
import {useState, useEffect} from 'react';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3client = new S3Client({
    credentials: {
        accessKeyId: process.env.REACT_APP_ACCESSKEYID,
        secretAccessKey: process.env.REACT_APP_SECRETACCESSKEY,
    },
    region: process.env.REACT_APP_REGION
});

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
            "Bucket": String(process.env.REACT_APP_BUCKETNAME),
            "Key": String(process.env.REACT_APP_KEY),
        }
        const command = new PutObjectCommand(s3input);
        // needs error handling
        const response = await s3client.send(command);
    }

    const handleTextInputChange = (e) => {
        e.preventDefault();
        setTextInput(e.target.value);
    }
    const handleFileChange = async (e) => {
        e.preventDefault();
        const raw_file = e.target.files[0];
        // should use typescript here. nametype annotations will do as well.
        const file_array = raw_file.name.split('.');
        // set the name of the [FileInput] and set the extension to '.txt'
        const file_name = file_array[0] + '.txt';
        let file_text = await raw_file.text();
        let file = new File([file_text], file_name);
        console.log(file);
        let file_size = file.size;
        setFileInput(file);
    }

    return (
        <form action="" method="get" className="form-example">
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


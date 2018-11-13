import express from 'express';
import pkg from 'package.json';

const app: express.Application = express();
const port: number = +(process.env.PORT || 3000);


app.get('/', (req, res) => {
    res.redirect('/index.html');
});

const client_files: {[key: string]: string} = pkg.client_files;
for (const key of Object.keys(client_files)) {
    const value: string = client_files[key];
    app.use('/' + key, express.static(value));
}

app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}/`);
});

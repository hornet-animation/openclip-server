var config = require('./config.js');

var express = require('express');
var exphbs  = require('express-handlebars');
var bp = require('body-parser');

var os = require('os'); 
var spawn = require('child_process').spawn;
var execf = require('promisify-child-process').execFile;
var proc = spawn(config.cmd, config.args, { cwd: config.cwd });
proc.stdin.setEncoding('utf-8');
proc.stdout.setEncoding('utf-8');

// Setup express and IO
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// Setup handlebars as engine
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');
app.use(bp.urlencoded({extended: false}));
app.use(bp.json());

// Default endpoint
app.get('/', function(req, res){
	res.render('home');
});

// Setup socket.io
io.on('connection', function(socket){
	socket.on('cmd', function(msg){
		proc.stdin.write(msg + os.EOL);
	});
});

// Setup the handling of process output and errors
proc.stdout.on('data', function(data) {
	io.emit('log', data);
});
proc.stderr.on('data', function(data) {
	io.emit('error', data);
});
proc.on('close', function(code, signal) {
	console.log('Application closed');
});

app.post('/', async (req,res) => {
	pkg = req.body;
	if (('output' in pkg) && ('pattern' in pkg)){
		io.emit('cmd','Invoking Openclip Creator \n');
		io.emit('cmd','with pattern  ${pkg["pattern"]} \n');
		io.emit('cmd','on  ${pkg["output"]} \n');
		await execf('./openclip_creator', ['-m', 'pattern', '-o' ,pkg["output"], '--pattern', pkg["pattern"], '--noui']);
	}
	res.send('cmd ran');
});

// Run HTTP server
http.listen(config.port, function(){
	console.log(`listening on *:${config.port}`);
});

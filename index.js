const fs = require('fs');
const nzhcn = require("nzh/cn");
const moment = require('moment-timezone');
const svg2img = require('svg2img');
const { spawn } = require("child_process");
moment.locale('zh-CN');
moment.tz.setDefault('Europe/London');

const svgString = fs.readFileSync('efgcc-signal-static.svg', {encoding: 'utf8'});
const killOn = 'error';
const logLevel = 0 ? 'verbose' : killOn;

init();

function init() {
  let ffmpeg = spawn('ffmpeg', [
    "-loglevel", logLevel,
    "-re",
    "-f", "image2pipe",
    "-c:v", "png",
    "-framerate", "1",
    "-i", "-",

    "-filter_complex", "amovie=waiting.mp3:loop=0,asetpts=N/SR/TB",

    "-c:a", "aac",
    "-b:a", "128k",

    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-tune", "stillimage",
    "-vf", "fps=5,format=yuv420p",
    "-g", "10",

    "-f", "flv", "rtmp://localhost:1935/local/waiting"
  ]);
	ffmpeg.stdout.on('data', data => {
  	console.log(`ffmpeg stdout: ${data}`);
	});
	ffmpeg.stderr.on('data', data => {
  	console.log(`ffmpeg stderr: ${data}`);
    if (logLevel === killOn) {
      ffmpeg.kill();
      console.log(moment().toISOString(), 'restarting...');
      init();
    }
	});
  makeSundaySvg().then(buf => {
    for (let i = 0; i < 30; i++)
      ffmpeg.stdin.write(buf);
    return;
  });
	setInterval(() => {
    makeSundaySvg().then(buf => {
      for (let i = 0; i < 30; i++)
        ffmpeg.stdin.write(buf)
      return;
    });
	}, 30000);
}

function makeSundaySvg() {
  let info = nextSunday();
  let text = info.live ? '请稍候 // please wait' : countdown(moment(), info.next);
  return svg(text);
}

function nextSunday() {
  let now = moment();
  let live, next;
  if (now.day() === 0) {
    let showTime = moment(now).hour(11).startOf('hour');
    let endTime = moment(showTime).hour(14);
    if (now < showTime) {
      live = false;
      next = showTime;
    } else {
      live = (now < endTime);
      next = showTime.add(7, 'd').hour(11).startOf('hour');
    }
  } else {
    live = false;
    next = moment(now).add(7 - now.day(), 'd').hour(11).startOf('hour');
  }
  return {next: next, live: live};
}

function svg(text) {
  return new Promise((resolve, reject) => {
    let content = svgString.replace(/{{\s*TEXT\s*}}/g, text);
    return svg2img(content, {
      width: 1280,
      height: 720
    }, (error, buffer) => {
      return resolve(buffer);       
    });
  });
}

function countdown(a, b) {
  const regex = /\s*([0-9]+)\s*/g;
  let text = moment(a).to(moment(b));
  let en = moment(a).locale('en').to(moment(b));
  let num = regex.test(text);
  while (num) {
    text = text.replace(regex, (match, p1) => nzhcn.encodeS(+p1));
    num = regex.test(text);
  }
  return `${text} // ${en}`;
}

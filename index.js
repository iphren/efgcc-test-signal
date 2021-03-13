const fs = require('fs');
const nzhcn = require("nzh/cn");
const moment = require('moment-timezone');
const svg2img = require('svg2img');
const { spawn } = require("child_process");
moment.locale('zh-CN');
moment.tz.setDefault('Europe/London');

const svgString = fs.readFileSync('efgcc-signal-static.svg', {encoding: 'utf8'});

init();

function init() {
  let ffmpeg = spawn('ffmpeg', [
    "-y",
    "-loglevel", "warning",
    "-f", "image2pipe",
    "-c:v", "png",
    "-loop", "0",
    "-framerate", "0.1",
    "-i", "-",
    "-an", "-f", "hls",
    "-vcodec", "libx264",
    "-g", "2", "-keyint_min", "2",
    "-vf", "fps=1,format=yuv420p",
    //"-start_number", "1", "-hls_time", "2", "-hls_list_size", "30",
    //"-hls_flags", "delete_segments",
    //"videos/waiting.m3u8"
    "-f", "flv", "rtmp://localhost:1935/local/waiting"
  ]);
	ffmpeg.stdout.on('data', data => {
  	console.log(`ffmpeg stdout: ${data}`);
	});
	ffmpeg.stderr.on('data', data => {
  	console.log(`ffmpeg stderr: ${data}`);
	});
  makeSundaySvg().then(buf => ffmpeg.stdin.write(buf));
	setInterval(() => {
    makeSundaySvg().then(buf => ffmpeg.stdin.write(buf));
	}, 10000);
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



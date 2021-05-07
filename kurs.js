// Проверяем зашёл ли пользователь с мобильного браузера
const mobile = ( navigator.userAgent.match(/Android/i)
|| navigator.userAgent.match(/webOS/i)
|| navigator.userAgent.match(/iPhone/i)
|| navigator.userAgent.match(/iPod/i)
|| navigator.userAgent.match(/BlackBerry/i)
|| navigator.userAgent.match(/Windows Phone/i)
);

var canvas = document.getElementById("main_canvas");

// задаём размер холста в зависимости от девайса с которого открыта страница у пользователя
if (mobile) {
	canvas.width = 360;
	canvas.height = 225;
} else {
	canvas.width = 900;
	canvas.height = 600;
}

// высота/ширина генеруемого огня будет 85% от высоты/ширины холста
var WIDTH = Math.floor(0.85 * canvas.width);
var HEIGHT = Math.floor(0.85 * canvas.height);

// инициализируем context холста
var gl = canvas.getContext('webgl');

if(!gl){
	alert("Ошибка получения контекста");
}

// шаг времени
var dt = 0.025;
// время
var time = 0.0;
// значение свечения
var bloom = 50;
// параметры размытия
var blurFactor = 3;
var blurCount = 5;

var type = 0; // можно выбрать разные варианты отображения цвета огня (от 0 до 3)
var toggle_render = true;

// меняем режим отображения для мобильных девайсов
if (mobile) {
	bloom = 50;
	blurFactor= 1;
}

// задаём размер материала
function setSize(){
	material.size = size;
}

// задаёт цвет в hex формате
function setColour(){
	material.color.setHex(colour);
}


// код шейдера (используем язык GLSL) задаётся в формате строки и передаётся в webgl метод 
// `` - эти кавычки позволяют вставлять многострочный текст в string переменную

// вершинный шейдер
var flameVertexSource = `
	attribute vec2 position;
	void main() {
		// gl_Position обрабавыет поочередно координаты каждого пикселя
		gl_Position = vec4(position, 0.0, 1.0); // переменная вектор
	}
`;

// фрагментный шейдер
var flameFragmentSource = `
	precision highp float;
	const float WIDTH = ` + WIDTH + `.0;
	const float HEIGHT = ` + HEIGHT + `.0;
	// передаём в шейдер переменные времени и тип девайса
	// uniform переменные можно менять через другие языки программирования
	uniform float time;
	uniform int type;

	// алгоритм шума для webgl взятый отсюда - https://github.com/stegu/webgl-noise
	// этот алгоритм называется - Array and textureless GLSL 2D simplex noise function

	vec3 mod289(vec3 x) {return x - floor(x * (1.0 / 289.0)) * 289.0;} vec2 mod289(vec2 x) {return x - floor(x * (1.0 / 289.0)) * 289.0;} vec3 permute(vec3 x) {return mod289(((x*34.0)+1.0)*x);} float snoise(vec2 v){const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439); vec2 i  = floor(v + dot(v, C.yy) ); vec2 x0 = v -   i + dot(i, C.xx); vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0); vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1; i = mod289(i); vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 )); vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0); m = m*m ; m = m*m ; vec3 x = 2.0 * fract(p * C.www) - 1.0; vec3 h = abs(x) - 0.5; vec3 ox = floor(x + 0.5); vec3 a0 = x - ox; m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h ); vec3 g; g.x  = a0.x  * x0.x  + h.x  * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw; return 130.0 * dot(m, g);}
	// это конец алгоритма

	void main() {
		float x = gl_FragCoord.x/(WIDTH);
		float y = gl_FragCoord.y/(WIDTH);
		float gradient = gl_FragCoord.y/(HEIGHT);
		
		// здесь настраивается цвет в RGB формате, но в glsl переменные цвета должны быть в диапазоне 0.0 - 1.0
		// Пример: RGB цвет (255, 122, 0) нужно задавать как (1.0, 0.5, 0.0) 
		float r = 0.6;
		float g = 0.0;
		float b = 0.2;

		// получаем значение шума в определенном пикселе и немного смешиваем его
		float noise = snoise(vec2(x/10.0,y/10.0 + 11.0));
		noise += gradient * snoise(vec2(x*2.0,y*2.0 + 1.5 * time));
		noise += gradient * snoise(vec2(x*3.0,y*3.0 + 2.0 * time));
		noise += gradient * snoise(vec2(x*6.0,y*6.0 + 3.0 * time));

		// значение не может быть меньше 0.0, если оно случайно становится таковым назначаем переменной noise 0
		noise = max(0.0, noise);

		// меняем эффект отображения в зависимости от заданного типа
		if (type == 0) {
			//от красного к желтому
			g = 3.0 * noise * (gradient);
			b = noise * (gradient)/2.0;
		} else if(type == 1) {
			// зеленый
			r = noise * (gradient);
			g = 1.0;
			b = noise * (gradient)/2.0; 
		} else if(type == 2) {
			// синий
			r = noise * (gradient)/2.0; 
			g = 3.0 * noise * (gradient);
			b = 1.0; 
		} else if(type == 3) {
			// синий пурпурный и желтый
			r = 3.0 * noise * (gradient * 10.0);
			g = noise * (gradient);
			b = 0.5 - gradient; 
		}

	noise *= 0.65*(1.0-gradient);

	//m = 1.0 если (gradient * 0.5) < noise, иначе он равен 0.0
	float m = step(gradient * 0.5, noise); // step меняется с течением времени

	// меняем значение цвета в текущем пикселе
	gl_FragColor = vec4(m * r, m * g, m * b, 1.0);
	}
`;

// ШЕЙДЕРЫ РАЗМЫТИЯ

// эти шейдеры основаны на алгоритме от ThinMatrix
// оно использует гауссово размытие с шириной 11

// вершинные шейдера для x и y
var blurXVertexSource = `
	attribute vec2 texPosition;
	varying vec2 blurTextureCoords[11];
	uniform float width;

	void main() {
		//texCoord = texPosition;
		gl_Position = vec4(texPosition, 0.0, 1.0);
		vec2 centreTexCoords = texPosition * 0.5 + 0.5;
		float pixelSize = 1.0/width;

		for(int i = -5; i <= 5; i++) {
			blurTextureCoords[i+5] = centreTexCoords + vec2(pixelSize * float(i), 0.0);
		}
	}
`;

var blurYVertexSource = `
	attribute vec2 texPosition;
	varying vec2 blurTextureCoords[11];
	uniform float height;

	void main() {
		gl_Position = vec4(texPosition, 0.0, 1.0);
		vec2 centreTexCoords = texPosition * 0.5 + 0.5;
		float pixelSize = 1.0/height;

		for(int i = -5; i <= 5; i++) {
			blurTextureCoords[i+5] = centreTexCoords + vec2(0.0, pixelSize * float(i));
		}
	}
`;


// фрагментный шейдер
var blurFragmentSource = `
	precision highp float;

	varying vec2 texCoord;
	uniform sampler2D texData;

	varying vec2 blurTextureCoords[11];

	void main() {
	vec4 colour = vec4(0.0);
	colour += texture2D(texData, blurTextureCoords[0]) * 0.0093;
	colour += texture2D(texData, blurTextureCoords[1]) * 0.028002;
	colour += texture2D(texData, blurTextureCoords[2]) * 0.065984;
	colour += texture2D(texData, blurTextureCoords[3]) * 0.121703;
	colour += texture2D(texData, blurTextureCoords[4]) * 0.175713;
	colour += texture2D(texData, blurTextureCoords[5]) * 0.198596;
	colour += texture2D(texData, blurTextureCoords[6]) * 0.175713;
	colour += texture2D(texData, blurTextureCoords[7]) * 0.121703;
	colour += texture2D(texData, blurTextureCoords[8]) * 0.065984;
	colour += texture2D(texData, blurTextureCoords[9]) * 0.028002;
	colour += texture2D(texData, blurTextureCoords[10]) * 0.0093;
	gl_FragColor = colour;
	}
`;

// ШЕЙДЕРЫ ЯРКОСТИ
// так же основаны на алгоритме от ThinMatrix
// выбирает для отображения только самые яркие пиксели

var brightVertexSource = `
	attribute vec2 texPosition;
	varying vec2 texCoord;

	void main() {
		// конвертирует координаты текстуры [0 .. 1]  в координаты мира [-1 .. 1]
		texCoord = texPosition;
		gl_Position = vec4(texPosition*2.0-1.0, 0.0, 1.0);
	}
`;

var brightFragmentSource = `
	precision highp float;

	varying vec2 texCoord;
	uniform sampler2D brightData;
	uniform float bloom;

	void main() {
	vec4 colour = texture2D(brightData, texCoord);
	float brightness = (colour.r * 0.2126) + (colour.g * 0.7152) + (colour.b * 0.0722);
	gl_FragColor = colour * (brightness * bloom);
}
`;

// эти шейдеры комбинирует в себе все остальные
var combineVertexSource = `
	attribute vec2 texPosition;
	varying vec2 texCoord;

	void main() {
	// конвертирует координаты текстуры [0 .. 1]  в координаты мира [-1 .. 1]
	texCoord = texPosition;
	gl_Position = vec4(texPosition*2.0-1.0, 0.0, 1.0);
}
`;

var combineFragmentSource = `
	precision highp float;

	varying vec2 texCoord;
	uniform sampler2D srcData;
	uniform sampler2D blurData;

	void main() {
	vec4 srcColour = texture2D(srcData, texCoord);
	vec4 blurColour = texture2D(blurData, texCoord);
	gl_FragColor = srcColour + blurColour;
}
`;

// эта функция компилирует шейдеры и комбенирует их
function compileShader(shaderSource, shaderType){

	var shader = gl.createShader(shaderType);
	gl.shaderSource(shader, shaderSource);
	gl.compileShader(shader);

	// если шейдеры не скомпилируются отобразим ошибку
	if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
		throw "Shader compile failed with: " + gl.getShaderInfoLog(shader);
	}

	return shader;
}

// если не получится найти attribute переменную в шейдере выдаёт ошибку
function getAttribLocation(program, name) {
	var attributeLocation = gl.getAttribLocation(program, name);
	
	if (attributeLocation === -1) {
		throw 'Невозможно найти attribute ' + name + '.';
	}

	return attributeLocation;
}

// тоже самое для uniform переменных
function getUniformLocation(program, name) {
	var attributeLocation = gl.getUniformLocation(program, name);
	
	if (attributeLocation === -1) {
		throw 'Невозможно найти uniform ' + name + '.';
	}

	return attributeLocation;
}

function createAndSetupTexture(gl) {
	var texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);

	// задаёт текстуру так что мы можем рендерить любой размер
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

	return texture;
}

// СОЗДАЁМ И КОМПИЛИРУЕМ ВСЕ НАШИ ШЕЙДЕРЫ
var flameVertexShader = compileShader(flameVertexSource, gl.VERTEX_SHADER);
var flameFragmentShader = compileShader(flameFragmentSource, gl.FRAGMENT_SHADER);

var combineVertexShader = compileShader(combineVertexSource, gl.VERTEX_SHADER);
var combineFragmentShader = compileShader(combineFragmentSource, gl.FRAGMENT_SHADER);

var x_blurVertexShader = compileShader(blurXVertexSource, gl.VERTEX_SHADER);
var x_blurFragmentShader = compileShader(blurFragmentSource, gl.FRAGMENT_SHADER);

var y_blurVertexShader = compileShader(blurYVertexSource, gl.VERTEX_SHADER);
var y_blurFragmentShader = compileShader(blurFragmentSource, gl.FRAGMENT_SHADER);

var brightVertexShader = compileShader(brightVertexSource, gl.VERTEX_SHADER);
var brightFragmentShader = compileShader(brightFragmentSource, gl.FRAGMENT_SHADER);

// СОЗДАЁМ ПРОГРАММЫ ШЕЙДЕРОВ (нужно в WebGL)
var flame_program = gl.createProgram();
gl.attachShader(flame_program, flameVertexShader);
gl.attachShader(flame_program, flameFragmentShader);
gl.linkProgram(flame_program);

var x_blur_program = gl.createProgram();
gl.attachShader(x_blur_program, x_blurVertexShader);
gl.attachShader(x_blur_program, x_blurFragmentShader);
gl.linkProgram(x_blur_program);

var y_blur_program = gl.createProgram();
gl.attachShader(y_blur_program, y_blurVertexShader);
gl.attachShader(y_blur_program, y_blurFragmentShader);
gl.linkProgram(y_blur_program);

var bright_program = gl.createProgram();
gl.attachShader(bright_program, brightVertexShader);
gl.attachShader(bright_program, brightFragmentShader);
gl.linkProgram(bright_program);

var combine_program = gl.createProgram();
gl.attachShader(combine_program, combineVertexShader);
gl.attachShader(combine_program, combineFragmentShader);
gl.linkProgram(combine_program);

// создаём прямоугольник Rect который будет заполнять весь наш холст 
var vertexData = new Float32Array([
-1.0,  1.0, // левый верхний угол
-1.0, -1.0, // левый нижний угол
1.0,  1.0, // верхний правый угол
1.0, -1.0, // нижний правый угол
]);

// создаём вершинный буфер
var vertexDataBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexDataBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

// что бы получить геометрическую информацию доступную в шейдере в attribute переменных
// мы должны сделать следующее:
var positionHandle = getAttribLocation(flame_program, 'position');

gl.enableVertexAttribArray(positionHandle);
gl.vertexAttribPointer(positionHandle,
	2, // получаем значения в виде vec2
	gl.FLOAT, // каждый компонент типа float
	false, // не нормализовывать значения
	2 * 4,
	0
);

// получаем локацию uniform переменных
var timeHandle = getUniformLocation(flame_program, 'time');
var typeHandle = getUniformLocation(flame_program, 'type');
var widthHandle = getUniformLocation(x_blur_program, 'width');
var heightHandle = getUniformLocation(y_blur_program, 'height');
var srcLocation = gl.getUniformLocation(combine_program, "srcData");
var blurLocation = gl.getUniformLocation(combine_program, "blurData");
var brightLocation = gl.getUniformLocation(bright_program, "brightData");
var bloomHandle = gl.getUniformLocation(bright_program, "bloom");

// создаём и закрепляем буфер для каждого кадра
var flameFramebuffer = gl.createFramebuffer();
flameFramebuffer.width = canvas.width;
flameFramebuffer.height = canvas.height;
gl.bindFramebuffer(gl.FRAMEBUFFER, flameFramebuffer);

// создаём и настраиваем текстуру
var flameTexture = createAndSetupTexture(gl);

// передаём текстуру в шейдер
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, flameFramebuffer.width, flameFramebuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, flameTexture, 0);

// настраиваем размытие
var blurFBO = [];
var blurTexture = [];

for(i = 0; i < 2; i++){
	var framebuffer = gl.createFramebuffer();
	framebuffer.width = canvas.width;
	framebuffer.height = canvas.height;
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
	var texture = createAndSetupTexture(gl);

	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, framebuffer.width, framebuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

	blurFBO.push(framebuffer);
	blurTexture.push(texture);
}

// ГЛАВНЫЙ ЦИКЛ

var iterations = 0; // количество итераций

// является ли объект видимым ( внутри окна браузера )
function isVisible(obj){
	var clientRect = obj.getBoundingClientRect();
	return (clientRect.y > -clientRect.height/2) && (clientRect.y < clientRect.height/2);
}

// эта функция обновляется постоянно
function step(){

if(isVisible(canvas)){

	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.activeTexture(gl.TEXTURE0);

	if(toggle_render || (iterations == 0)){
	// обновляем время
	time -= dt;

	// рисуем языки пламени
	gl.useProgram(flame_program);
	// отправляем значение времени в шейдеры
	gl.uniform1f(timeHandle, time);
	gl.uniform1i(typeHandle, type);

	// отрисовываем текстуру
	gl.bindFramebuffer(gl.FRAMEBUFFER, flameFramebuffer);
	// рисуем графику в режиме - triangle strip который соединяет треугольники в режими от нулевого к четвертому
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

	// обрабатываем сгенерированную картинку шейдером яркости
	gl.useProgram(bright_program);
	gl.uniform1f(bloomHandle, bloom);
	gl.bindFramebuffer(gl.FRAMEBUFFER, blurFBO[0]);
	gl.bindTexture(gl.TEXTURE_2D, flameTexture);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

	// теперь размываем изображение соотв.  шейдерами
	for(i = 1; i < blurCount; i++){
	gl.useProgram(x_blur_program);
	gl.uniform1f(widthHandle, WIDTH/(i * blurFactor));
	gl.bindFramebuffer(gl.FRAMEBUFFER, blurFBO[1]);
	gl.bindTexture(gl.TEXTURE_2D, blurTexture[0]);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

	gl.useProgram(y_blur_program);
	gl.uniform1f(heightHandle, HEIGHT/(i * blurFactor));
	gl.bindFramebuffer(gl.FRAMEBUFFER, blurFBO[0]);
	gl.bindTexture(gl.TEXTURE_2D, blurTexture[1]);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}

	// комбенируем оригинальную и размытую картинку
	gl.useProgram(combine_program);

	// ОТРИСОВЫВАЕМ ВСЁ ЭТО ДЕЛО В ХОЛСТ
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);

	gl.uniform1i(srcLocation, 0);
	gl.uniform1i(blurLocation, 1); 
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, flameTexture);
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, blurTexture[0]);

	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}

	iterations = 1;
	}
	
	requestAnimationFrame(step); // ПОСТОЯННО ВЫЗЫВАЕМ ЭТУ ФУНКЦИЮ
}

step();
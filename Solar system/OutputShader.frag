#version 130

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform vec3 u_pos;
uniform sampler2D u_skybox;
uniform sampler2D u_sun;

const float MAX_DIST = 99999.0;
const vec4 lightPos = vec4(0.0, 0.0, 0.0, 20.0);
const vec3 lightCol = vec3(1.0, 0.8, 0.3);

float earthRadius = 2.0;
float moonRadius = 1.0;
float earthDist = 60.0;
float moonDist = 6.0;
float R = earthDist - moonDist;
float m = moonDist / earthDist;
float h = 5.0;

//float u_time = 60;

mat2 rot(float a) {
	float s = sin(a);
	float c = cos(a);
	return mat2(c, -s, s, c);
}

vec2 sphIntersect(in vec3 rayOrigin, in vec3 rayDirection, float ra) {
	float b = dot(rayOrigin, rayDirection);
	float c = dot(rayOrigin, rayOrigin) - ra * ra;
	float h = b * b - c;
	if(h < 0.0) return vec2(-1.0);
	h = sqrt(h);
	return vec2(-b - h, -b + h);
}

vec3 getSky(vec3 rayDirection) {
	vec2 uv = vec2(atan(rayDirection.x, rayDirection.y), asin(rayDirection.z) * 2.0);
	uv /= 3.14159265;
	uv = uv * 0.5 + 0.5;
	vec3 col = texture(u_skybox, uv).rgb;
	return col;
}

vec3 getSunTexture(vec3 normal) {
	vec2 uv = vec2(atan(normal.x, normal.y), asin(normal.z) * 2.0);
	uv /= 3.14159265;
	uv = uv * 0.5 + 0.5;
	vec3 col = texture(u_sun, uv).rgb;
	return col;
}

vec4 castRay(inout vec3 rayOrigin, inout vec3 rayDirection) {
	vec4 col;
	vec2 minIntersectionLength = vec2(MAX_DIST);
	vec2 intersectionLength;
	vec3 normal;
	mat2x4 spheres[10];

	float moonx = R * (m + 1) * sin(m * u_time) - h * sin((m + 1) * u_time);
	float moony = R * (m + 1) * cos(m * u_time) - h * cos((m + 1) * u_time);

	// Sun
	spheres[0][0] = vec4(0.0, 0.0, 0.0, 20.0);
	spheres[0][1] = vec4(1.0, 0.86, 0.0, -2.0);
	// Mercury
	spheres[1][0] = vec4(vec3(cos(5.0 + u_time * 0.25), sin(5.0 + u_time * 0.25), 0.0) * 30.0, 0.4);
	spheres[1][1] = vec4(0.55, 0.28, 0.0, 1.0);
	// Venus
	spheres[2][0] = vec4(vec3(sin(42.0 + u_time * 0.2), cos(42.0 + u_time * 0.2), 0.0) * 50.0, 0.9);
	spheres[2][1] = vec4(1.0, 0.44, 0.0, 1.0);
	// Earth
	spheres[3][0] = vec4(vec3(sin(u_time * 0.1), cos(u_time * 0.1), 0.0) * earthDist, earthRadius);
	spheres[3][1] = vec4(0.0, 0.44, 1.0, 1.0);
	// Mars
	spheres[4][0] = vec4(vec3(sin(95.0 + u_time * 0.15), cos(95.0 + u_time * 0.15), 0.0) * 60.0, 0.5);
	spheres[4][1] = vec4(1.0, 0.2, 0.0, 1.0);
	// Jupiter
	spheres[5][0] = vec4(vec3(cos(75.0 + u_time * 0.09), sin(75.0 + u_time * 0.09), 0.0) * 140.0, 10.0);
	spheres[5][1] = vec4(0.98, 0.76, 0.5, 1.0);
	// Saturn
	spheres[6][0] = vec4(vec3(sin(60.0 + u_time * 0.07), cos(60.0 + u_time * 0.07), 0.0) * 200.0, 9.0);
	spheres[6][1] = vec4(1.0, 0.71, 0.4, 1.0);
	// Uranus
	spheres[7][0] = vec4(vec3(sin(35.0 + u_time * 0.04), cos(35.0 + u_time * 0.04), 0.0) * 260.0, 5.0);
	spheres[7][1] = vec4(0.5, 0.74, 0.98, 1.0);
	// Neptune
	spheres[8][0] = vec4(vec3(sin(89.0 + u_time * 0.04), cos(89.0 + u_time * 0.04), 0.0) * 300.0, 5.0);
	spheres[8][1] = vec4(0.24, 0.43, 0.63, 1.0);
	// Moon
	spheres[9][0] = vec4(moonx, moony, 0.0, 0.2);
	spheres[9][1] = vec4(1.0, 0.8, 0.3, 1.0);

	
	for (int i = 0; i < spheres.length(); i++) {
		intersectionLength = sphIntersect(rayOrigin - spheres[i][0].xyz, rayDirection, spheres[i][0].w);
		if(intersectionLength.x > 0.0 && intersectionLength.x < minIntersectionLength.x) {
			minIntersectionLength = intersectionLength;
			vec3 intersectionPosition = rayOrigin + rayDirection * intersectionLength.x;
			normal = normalize(intersectionPosition - spheres[i][0].xyz);
			col = spheres[i][1];
		}
	}

	if(minIntersectionLength.x == MAX_DIST) return vec4(getSky(rayDirection), -2.0);

	vec3 intersectionPosition = rayOrigin + rayDirection * minIntersectionLength.x;
	
	if(col.a == -2.0) return vec4(getSunTexture(normal), -2.0);
	
	vec3 lightDir = normalize(lightPos.xyz - intersectionPosition);
	float distance = length(lightPos.xyz - intersectionPosition) - lightPos.w;
	float attenuation = 500.0 / distance;
	float diffuse = max(0.0, dot(lightDir, normal)) * attenuation;
	//float specular = pow(max(0.0, dot(reflect(rayDirection, normal), lightDir)), 32.0);
	//col *= mix(diffuse, specular, 0.5);
	col *= diffuse;
	rayOrigin += rayDirection * (minIntersectionLength.x - 0.001);
	rayDirection = normal;
	return vec4(col.rgb * lightCol, col.a);
}

vec3 traceRay(vec3 rayOrigin, vec3 rayDirection) {
	vec4 col = castRay(rayOrigin, rayDirection);

	if(col.a != -2.0) {
		vec3 lightDir = normalize(lightPos.xyz - rayOrigin);

		if (dot(rayDirection, lightDir) > 0) {
			vec4 intersectionLength = castRay(rayOrigin, lightDir);
			if(intersectionLength.x != -1.0 && intersectionLength.w != -2.0) col *= 0.0;
		}
	}

	return col.rgb;
}

void main() {
	vec2 uv = (gl_TexCoord[0].xy - 0.5) * u_resolution / u_resolution.y;
	vec3 rayOrigin = u_pos;
	vec3 rayDirection = normalize(vec3(1.0, uv));
	rayDirection.zx *= rot(-u_mouse.y);
	rayDirection.xy *= rot(u_mouse.x);

	vec3 col = traceRay(rayOrigin, rayDirection);
	gl_FragColor = vec4(col, 1.0);
}
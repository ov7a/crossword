var wordlist;

function get_lines(){
	return wordlist.value.split(/\r|\r\n|\n/);
};

function random(upper){
	return Math.floor(Math.random() * upper);
};

function shuffle(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = random(i + 1);
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
};

function get_words(){
	var inputs = get_lines();
	var words = Object(); //should be a Set, but object is backward compatible
	Array.prototype.forEach.call(inputs, function(input){
		var word = input.trim().toUpperCase();
		if (word != ""){
			words[word] = 1;
		}
	});
	return Object.keys(words);
};

function get_letters(words){
	var letters = Object(); //should be a Set, but object is backward compatible
	words.forEach(function(word){
		Array.prototype.forEach.call(word, function(letter){
			letters[letter] = 1; 
		});
	});
	return Object.keys(letters);
};

function draw_letters(letters){
	var table = document.getElementById("letters");
	table.innerHTML = "";
	var header_row = document.createElement("tr");
	var letters_row = document.createElement("tr");
	for (var i = 0; i < letters.length; i++){
		var header = document.createElement("td");
		header.innerHTML = i + 1;
		header_row.appendChild(header);
		
		var letter = document.createElement("td");
		letter.className = "filled";
		letter.innerHTML = "<span>" + letters[i] + "</span>";
		letters_row.appendChild(letter);
	}
	table.appendChild(header_row);
	table.appendChild(letters_row);
};

function draw_crossword(net, letters){
	var table = document.getElementById("crossword");
	table.innerHTML = "";
	for (var y = 0; y < net.length; y++){
		var tr = document.createElement("tr");
		for (var x = 0; x < net[y].length; x++){
			var td = document.createElement("td");
			if (net[y][x] != undefined){
				var index = letters.indexOf(net[y][x]) + 1;
				td.innerHTML = "<sup><small>" + index + "</small></sup> <span>" + net[y][x] + "</span>";
				td.className = "filled";
			} else {
				td.className = "empty";
			}
			tr.appendChild(td);
		}
		table.appendChild(tr);
	}
};

function out_of_bounds(net, y, x){
	return x < 0 || y < 0 || net.length <= y || net[y].length <= x;
};

function get_limits(net){ 
	var max_x = 0;
	var max_y = 0;
	var min_x = net[0].length - 1;
	var min_y = net.length - 1;
	
	var x,y;
	
	for (y = 0; y < net.length; y++){
		var found = false;
		for (x = 0; x < net[0].length; x++){
			if (net[y][x] != undefined){
				min_x = x;
				max_x = x;
				min_y = y;
				max_y = y;
				found = true;
				break;
			}
		}
		if (found) break;
	}

	var dx = 1, dy = 0;
	var gdx = 0, gdy = 1;
	x = x - gdx;
	y = y - gdy;
	var start_x = x, start_y = y;
	do {
		var next_x = x + dx;
		var next_y = y + dy;
		var next_gx = next_x + gdx;
		var next_gy = next_y + gdy;
		var free_ahead = out_of_bounds(net, next_y, next_x) || net[next_y][next_x] == undefined;
		var has_ground = !out_of_bounds(net, next_gy, next_gx) && net[next_gy][next_gx] != undefined;
		if (free_ahead && has_ground){
			x = next_x;
			y = next_y;
			if (next_gx < min_x) min_x = next_gx;
			if (next_gx > max_x) max_x = next_gx;
			if (next_gy < min_y) min_y = next_gy;
			if (next_gy > max_y) max_y = next_gy;
		} else if (!free_ahead){
			var temp = dy;
			gdx = dx;
			gdy = dy;
			dy = -dx;
			dx = temp;
			if (next_x < min_x) min_x = next_x;
			if (next_x > max_x) max_x = next_x;
			if (next_y < min_y) min_y = next_y;
			if (next_y > max_y) max_y = next_y;
		} else if (!has_ground){
			x = next_gx;
			y = next_gy;
			var temp = dx;
			dx = gdx;
			dy = gdy;
			gdy = gdx;
			gdx = -temp;
		}
	} while (x != start_x || y != start_y);

	return {
		min_x: min_x,
		max_x: max_x,
		min_y: min_y,
		max_y: max_y
	};
}

function filler(size){
	return Array.apply(null, Array(size)).map(function () {});
}

function filler_obj(size, new_object){ //default parameter values is experimental :(
	return Array.apply(null, Array(size)).map(new_object);
}

function enlarge(net, used, largest_length){
	var limits = get_limits(net);
	
	var diff_x = limits.max_x + largest_length - net[0].length + 1;
	if (diff_x > 0){
		for (var y = 0; y < net.length; y++){
			Array.prototype.push.apply(net[y], filler(diff_x));
		}
	}

	var diff_x2 = largest_length - limits.min_x;
	if (diff_x2 > 0){
		for (var y = 0; y < net.length; y++){
			Array.prototype.unshift.apply(net[y], filler(diff_x2));
		}
		for (var i = 0; i < used.length; i++){
			used[i].x = used[i].x + diff_x2;
		}
	}

	var size_x = net[0].length;
	var diff_y = limits.max_y + largest_length - net.length + 1;	
	if (diff_y > 0){
		Array.prototype.push.apply(net, filler_obj(diff_y, function (){ return filler(size_x); }));
	}

	var diff_y2 = largest_length - limits.min_y;
	if (diff_y2 > 0){
		Array.prototype.unshift.apply(net, filler_obj(diff_y2, function (){ return filler(size_x); }));
		for (var i = 0; i < used.length; i++){
			used[i].y = used[i].y + diff_y2;
		}
	}
};

function shrink(net){
	var limits = get_limits(net);
	
	var diff_x = net[0].length - 1 - limits.max_x;
	if (diff_x > 0){
		for (var y = 0; y < net.length; y++){
			net[y].splice(limits.max_x + 1);
		}
	}
	
	if (limits.min_x != 0){
		for (var y = 0; y < net.length; y++){
			net[y].splice(0, limits.min_x - 1);
		}
	}
	
	var diff_y = net.length - 1 - limits.max_y;
	if (diff_y > 0){
		net.splice(limits.max_y + 1);
	}

	if (limits.min_y != 0){
		net.splice(0, limits.min_y - 1);
	}
};

function largest(words){
	var largest_length = 0;
	words.forEach(function(word){
		if (word.length > largest_length) largest_length = word.length;
	});	
	return largest_length;
};

function try_place(net, word, point, index, used, horizontal){
	var dx = 0, dy = 0;
	var start_x = point.x, start_y = point.y;
	if (horizontal){
		dx = 1;
		start_x = point.x - index;
	} else {
		dy = 1;
		start_y = point.y - index;
	}
	if (net[start_y - dy][start_x - dx] != undefined || net[start_y + dy * word.length][start_x + dx * word.length] != undefined){
		return false;
	}
	for (var i = 0; i < word.length; i++){ 
		var x = start_x + i * dx;
		var y = start_y + i * dy;
		if (net[y][x] != undefined && net[y][x] != word[i]){  
			return false;
		}
		if (i != index){
			if ((net[y - dx][x - dy] != undefined || net[y + dx][x + dy] != undefined) && net[y][x] != word[i]){ 
				return false;
			}
		}
	}
	
	for (var i = 0; i < word.length; i++){
		var x = start_x + i * dx;
		var y = start_y + i * dy;
		net[y][x] = word[i];
		used.push({
			x: x,
			y: y
		});
	}
	return true;
};

function generate_crossword(words){
	var net = [words[0].split('')];
	words.splice(0, 1);
	var used = [];
	for (var i = 0; i < net[0].length; i++){
		used.push({
			x: i,
			y: 0
		});
	}
	
	var iter = words.length * words.length;//FIXME: remove?
	var largest_length = largest(words);
	while (words.length > 0 && iter > 0){
		enlarge(net, used, largest_length);
		iter--;	
		for (var current_word = 0; current_word < words.length; current_word++){
			var placed = false;
			var word = words[current_word];
			shuffle(used);
			for (var i = 0; i < used.length && !placed; i++){
				var point = used[i];
				var letter = net[point.y][point.x];
				var index = word.indexOf(letter);
				while (index != -1 && !placed){
					var horizontal = net[point.y][point.x - 1] == undefined && net[point.y][point.x + 1] == undefined;
					var vertical =   net[point.y - 1][point.x] == undefined && net[point.y + 1][point.x] == undefined;
					if (!horizontal && !vertical){
						index = word.indexOf(letter, index + 1);
						continue;
					}
					placed = try_place(net, word, point, index, used, horizontal);
					index = word.indexOf(letter, index + 1);
				}
			}
			if (placed){
				words.splice(current_word, 1);
				if (word.length == largest_length){
					largest_length = largest(words);
				}
				break;
			}
		}
	}
	return net;
};

function generate(attempt){
	var words = get_words();
	if (words.length == 0){
		alert("Please, type some words");
		return;
	}
	var letters = get_letters(words);
	shuffle(letters);
	shuffle(words);
	//wordlist.value = words.join("\n");
	draw_letters(letters);
	var net = generate_crossword(words);
	if (words.length != 0){
		if (attempt == 100) {
			alert("Failed to generate crossword after 100 attempts. If words are correct, please retry.");
			draw_crossword(net, letters);
			return
		}
		generate(attempt + 1);
		return;
	}
	draw_crossword(net, letters);
	scrollTo(0, document.body.scrollHeight); //scroll down
};


function remove_line(caller){
	var index = Array.prototype.indexOf.call(caller.parentNode.children, caller);
	if (index == -1){
		alert("Error: caller not found!");
		return;
	}
	var lines = get_lines();
	lines.splice(index / 2, 1);
	var new_text = lines.join('\n');
	wordlist.value = new_text;
	words_input();
};

function words_input() {
	wordlist.style.height = "";
	wordlist.style.height = wordlist.scrollHeight + "px";
	
	var numbers = document.getElementById("numbers");
	var buttons = document.getElementById("buttons");
	var	lines_count = get_lines().length;
	var numbers_count = numbers.childNodes.length;
	var diff = lines_count - numbers_count;
	if (diff > 0){
		for (var i = 0; i < diff; i++){
			var number = document.createElement("li");
			numbers.appendChild(number);
			
			var button = document.createElement("a");
			button.innerHTML = "-";
			button.onclick = remove_line.bind(this, button);
			buttons.appendChild(button);
			buttons.appendChild(document.createElement("br"));
		}
	} else if (diff < 0){
		for (var i = 0; i < -diff; i++){
			numbers.removeChild(numbers.lastChild);
			buttons.removeChild(buttons.lastChild);
			buttons.removeChild(buttons.lastChild);
		}
	}
};

function clear_list(){
	wordlist.value = "";
	words_input();
};

function toggle_letters(){
	var checked = document.getElementById("toggle").checked;
	var stylesheet = document.getElementById("letters_style");
	if (checked){
		stylesheet.disabled = true;
	} else {
		stylesheet.disabled = false;	
	}
};

var placeholder = "Type\nwords\nhere";
function remove_placeholder(){
	if (wordlist.value == placeholder){
		clear_list();
		wordlist.removeAttribute("onfocus");	
	}
};

function onload(){
	wordlist = document.getElementById("wordlist");
	wordlist.value = placeholder;
	numbers.innerHTML = "";
	words_input();
	toggle_letters();
};

#!/usr/bin/env ruby -w

# pnginator.rb: pack a .js file into a PNG image with an HTML payload;
# when saved with an .html extension and opened in a browser, the HTML extracts and executes
# the javascript.

# Usage: ruby pnginator.rb input.js output.png.html

# By Gasman <http://matt.west.co.tt/>
# from an original idea by Daeken: http://daeken.com/superpacking-js-demos

require 'zlib'
require 'tempfile'

input_filename, output_filename = ARGV

f = File.open(input_filename, 'rb')
js = f.read
f.close

# js fits onto one pixel line
js += "\x00"
scanlines = [js]
width = js.length
height = 1

# Daeken's single-pixel-row bootstrap (requires js string to be reversed)
# (edit by Gasman: change eval to (1,eval) to force global evaluation and avoid massive slowdown)
# html = "<canvas id=q><img onload=for(p=q.width=#{width},(c=q.getContext('2d')).drawImage(this,0,e='');p;)e+=String.fromCharCode(c.getImageData(--p,0,1,1).data[0]);(1,eval)(e) src=#>"

# p01's single-pixel-row bootstrap (requires an 0x00 end marker on the js string)
# (edit by Gasman: move drawImage out of getImageData params (it returns undef, which is invalid) and change eval to (1,eval) to force global evaluation)
html = "<canvas id=c><img src=# onload=for(a=c.getContext`2d`,i=e='';a.drawImage(this,i--,0),t=a.getImageData(0,0,1,1).data[0];)e+=String.fromCharCode(t);eval(e)>"

# prepend each scanline with 0x00 to indicate 'no filtering', then concat into one string
image_data = scanlines.collect{|line| "\x00" + line}.join
idat_chunk = Zlib::Deflate.deflate(image_data, 9) # 9 = maximum compression

def png_chunk(signature, data)
	[data.length, signature, data, Zlib::crc32(signature + data)].pack("NA4A*N")
end

File.open(output_filename, 'wb') do |f|
	f.write("\x89PNG\x0d\x0a\x1a\x0a") # PNG file header

	f.write(png_chunk("IHDR", [width, height, 8, 0, 0, 0, 0].pack("NNccccc")))

	# a custom chunk containing the HTML payload; stated chunk length is 4 less than the actual length,
	# leaving the final 4 bytes to take the place of the checksum
	f.write([html.length - 4, "jawh", html].pack("NA4A*"))

	# can safely omit the checksum of the IDAT chunk  
	# f.write([idat_chunk.length, "IDAT", idat_chunk, Zlib::crc32("IDAT" + idat_chunk)].pack("NA4A*N"))
	f.write([idat_chunk.length, "IDAT", idat_chunk].pack("NA4A*"))

	# can safely omit the IEND chunk
	# f.write([0, "IEND", "", Zlib::crc32("IEND")].pack("NA4A*N"))
end

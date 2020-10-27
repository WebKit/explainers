# This Makefile assumes you have a local install of the Python markdown2
# module. You can install it like any other Python module, with pip:
#
#     pip install markdown2
#
# It also assumes you have doctoc installed. This is a tool that
# automatically generates Table of Contents for Markdown files. It can
# be installed like any other NPM module:
#
#    npm install -g doctoc

docs    = $(patsubst %.md,%.html,$(wildcard *.md))

.PHONY: all clean
.SUFFIXES: .md .html

all: $(docs)

clean:
	rm -f $(docs) *~

.md.html:
	echo "<!doctype html>\n<meta charset=utf-8>\n" > $@
	doctoc $<
	markdown2 $< >> $@

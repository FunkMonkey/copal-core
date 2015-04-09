CoPal
=====

CoPal is an application for quickly executing commands like launching programs and searching the web. 
It is similar to [Alfred](http://www.alfredapp.com/), [Gnome Do](http://do.cooperteam.net/), [Launchy](http://www.launchy.net/) and [Quicksilver](http://qsapp.com/index.php).

*It is in early development and not in a usable state!*

Design goals
------------

### Cross-platform

CoPal's graphical user interface ([copal-gui](https://github.com/FunkMonkey/copal-gui)) is based on [atom-shell](https://github.com/atom/atom-shell) and thus solely uses web technologies. If you don't need a graphical user interface, [node.js](https://nodejs.org/) is enough.

### Component-based and extendable

Commands in CoPal are assembled from atomic pieces called `Bricks`. Bricks are provided by CoPal-extensions and can be combined in 
endless variations. 

Here's an exmaple: a command that searches for articles on [Wikipedia](https://www.wikipedia.org/) could be assembled from the following bricks:
- An input brick that provides the search query
- A data brick that gets the results for the search query from Wikipedia
- An optional data brick that transforms the data to a specific output format
- An output brick that presents a visual list of results to the user
- An action brick that opens an URL in the browser after the user selected the according item in the list

### Data-driven

The data is at the center of a command. Input data (f. ex. a search query) is piped to data bricks transforming it to result data 
that is piped to output bricks.

### Multiple possible input and output methods

Unlike other productivity applications, CoPal wants to provide more input and output methods than a graphical user interface in the future. 
Imagine a voice recognition input brick or a synthesized speech output brick. Imagine console based output bricks.

Where does the name come from?
------------------------------

Whatever you prefer:

- That helpful command pal
- Command-Palette, known from [Sublime Text](http://www.sublimetext.com/) and [Atom](https://atom.io/)
- Copal as in [tree resin](http://en.wikipedia.org/wiki/Copal) - kinda gluey
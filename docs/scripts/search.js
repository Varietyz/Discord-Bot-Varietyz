var searchAttr = 'data-search-mode';

function contains(a,m){
    return (a.textContent || a.innerText || '').toUpperCase().indexOf(m) !== -1;
}

document.getElementById('nav-search').addEventListener('keyup', function(event) {
    var search = this.value.toUpperCase();

    if (!search) {

        document.documentElement.removeAttribute(searchAttr);

        document.querySelectorAll('nav > ul > li:not(.level-hide)').forEach(function(elem) {
            elem.style.display = 'block';
        });

        if (typeof hideAllButCurrent === 'function'){

            hideAllButCurrent();
        } else {

            document.querySelectorAll('nav > ul > li > ul li').forEach(function(elem) {
                elem.style.display = 'block';
            });
        }
    } else {

        document.documentElement.setAttribute(searchAttr, '');

        document.querySelectorAll('nav > ul > li').forEach(function(elem) {
            elem.style.display = 'block';
        });
        document.querySelectorAll('nav > ul').forEach(function(elem) {
            elem.style.display = 'block';
        });

        document.querySelectorAll('nav > ul > li > ul li').forEach(function(elem) {
            elem.style.display = 'none';
        });

        document.querySelectorAll('nav > ul > li > ul a').forEach(function(elem) {
            if (!contains(elem.parentNode, search)) {
                return;
            }
            elem.parentNode.style.display = 'block';
        });

        document.querySelectorAll('nav > ul > li').forEach(function(parent) {
            var countSearchA = 0;
            parent.querySelectorAll('a').forEach(function(elem) {
                if (contains(elem, search)) {
                    countSearchA++;
                }
            });

            var countUl = 0;
            var countUlVisible = 0;
            parent.querySelectorAll('ul').forEach(function(ulP) {

                if (contains(ulP, search)) {
                    countUl++;
                }

                var children = ulP.children;
                for (i=0; i<children.length; i++) {
                    var elem = children[i];
                    if (elem.style.display != 'none') {
                        countUlVisible++;
                    }
                }
            });

            if (countSearchA == 0 && countUl === 0){

                parent.style.display = 'none';
            } else if(countSearchA == 0 && countUlVisible == 0){

                parent.style.display = 'none';
            }
        });
        document.querySelectorAll('nav > ul.collapse_top').forEach(function(parent) {
            var countVisible = 0;
            parent.querySelectorAll('li').forEach(function(elem) {
                if (elem.style.display !== 'none') {
                    countVisible++;
                }
            });

            if (countVisible == 0) {

                parent.style.display = 'none';
            }
        });
    }
});

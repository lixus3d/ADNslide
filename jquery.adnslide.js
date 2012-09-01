;(function($){

    pluginName = 'ADNslide';

    $.ADNslide = function(el, options){

        // To avoid scope issues, use 'base' instead of 'this'
        // to reference this class from internal events and functions.
        var base = this;

        base.defaultOptions = {
            // hum ... what the hell with this option ?
            debug: false,
            // DefaultTimes
            initTime: 300, // time before the ADNslide launch, if it's too short the first animation might be lost in the loading time of the page
            slideTime: 5000, // duration of each slide
            slideAnimationTime: 1500, // duration of the transition of each slide (x2 because of hiding then showing)
            animationTime: 650, // default animation duration of sub element

            // DefaultDistances
            animationDistanceX: 200, // X Distance the sub element will travel during is animation
            animationDistanceY: 100, // Y Distance the sub element will travel during is animation

            // Behaviors
            animationType: 'fade', // fade, vertical, horizontal, rotateZ
            stopOnHover: true, // Does we stop the slide transition if the mouse is hover the slide

            // Misc
            backgroundElement: null,
            bulletClassActive: 'active',

            // 3D effect
            thirdDLeaveDelay: 500, // fallback to no 3d when mouse is out will be in this delay
            thirdDXratio: 1, // ratio of X displacement
            thirdDYratio: 0.5, // ratio of Y displacement
            thirdDlogic: 1, // element displacement direction 1 or -1 , might act as a global displacement ratio
        };

        // Access to jQuery and DOM versions of element
        base.$el = $(el);
        base.el = el;

        // Add a reverse reference to the DOM object
        base.$el.data("ADNslide", base);

        // Plugin vars
        base.thirdDelements = [];
        base.slides = base.$el.find('.jsSlide');
        base.slideTimer = null;
        base.bullets = [];
        base.slideQueue = []; // store the slide change demand
        base.slideTransitionning = false;
        base.slideQueueTimer = null;
        base.actualSlide = null;
        var logging = false;

        base.init = function(initOptions){
            base.options = $.extend({},base.defaultOptions, initOptions);
            if(base.options.debug) logging = true;
            // Put your initialization code here

            // set default position of all moving elements and hide them
            base.$el.find('.jsSlidesItem').each(function(){
                var item = $(this);
                item.data('slide-defX',item.offset().left);
                item.data('slide-defY',item.offset().top);
                item.css({visibility: 'hidden'});
            });

            // if we do horizontal transition, we must wrap slides in a very large container
            if(base.options.animationType=='horizontal'){
                var wrapper = $('<div class="jsSlideHorizontalWrapper" style="width:'+ (base.$el.width()*(base.slides.length+1)) +'px"></div>');
                wrapper.append(base.slides);
                base.$el.append(wrapper);
                // trick to adapt when the browser resize and the design is responsive
                $(window).resize(function(){
                    base.slides.css({
                        'float' : 'left',
                        'width' : base.$el.width()+'px',
                    });
                }).trigger('resize');
            }

            base.handler();

            window.setTimeout(function(){base.play()},base.options.initTime);
        };

        /**
         * Place the handler on next, previous and bullets elements. Must be define in the json object of the init call
         */
        base.handler = function(){
            // Add click to next and previous button (most likely arrow)
            if(base.options.handlerNext != null){
                var nextElement = $(base.options.handlerNext);
                if(nextElement.length >= 1){
                    nextElement.click(function(){
                        base.timeout(base.actualSlide+1,0);
                        return false;
                    });
                }
            }
            if(base.options.handlerPrevious != null){
                var previousElement = $(base.options.handlerPrevious);
                if(previousElement.length >= 1){
                    previousElement.click(function(){
                        base.timeout(base.actualSlide-1,0);
                        return false;
                    });
                }
            }
            // Add click to the bullets for each slide
            base.slides.each(function(k){
                var slide = $(this);
                var id = slide.attr('id');
                if(id!=''){
                    var bullets = $('a[href=#'+id+']');
                    base.bullets.push(bullets);
                    if(bullets.length>=1){
                        bullets.click(function(){
                            base.timeout(k,0);
                            return false;
                        });
                    }
                }
            });

        };

        /**
         * Automatic transition between slides
         */
        base.play = function(){
            logging?log('play'):null;
            base.timeout(0,0);
        };

        /**
         * Stop the automatic transition
         */
        base.stop = function(){
            logging?log('stop'):null;
            window.clearTimeout(base.slideTimer);
        };

        base.queue = function(slideNumber){
            if( (slideNumber > (base.slides.length-1))) slideNumber = 0;
            else if( slideNumber < 0 ) slideNumber = (base.slides.length-1);
            logging?log('queuing slide '+slideNumber):null;
            base.slideQueue.push(slideNumber);
            base.playQueue();
        };

        base.playQueue = function(){
            if(base.slideQueue.length >= 1){
                if(!base.slideTransitionning){
                    base.slideTransitionning = true;
                    base.slide(base.slideQueue[0]);
                }else{
                    window.clearTimeout(base.slideQueueTimer);
                    base.slideQueueTimer = window.setTimeout(function(){ base.playQueue();},100);
                }
            }
        };

        base.unqueue = function(){
            base.slideQueue.shift();
            base.slideTransitionning = false;
            if(base.slideQueue.length >= 1) base.playQueue();
        };

        /**
         * Tell the ADN plugin to go to the slideNumber slide
         * @param  int slideNumber The slide you want to see
         */
        base.slide = function(slideNumber){
            logging?log('going to slide '+slideNumber):null;

            base.getSlide(slideNumber).find('.jsSlidesItem').css({visibility: 'hidden'});

            if(base.actualSlide!=null){
                base.activeBullet(slideNumber);
                base.slideTransition(base.actualSlide,slideNumber,function(){
                    base.unqueue();
                    base.timeout(slideNumber+1); // timeout for the next one
                });
            }else{
                base.actualSlide = 0;
                base.activeBullet(slideNumber);
                base.animate(slideNumber,'forward',function(){
                    base.unqueue();
                    base.timeout(slideNumber+1); // timeout for the next one
                });
                base.fadeBackground(slideNumber);
            }

        };

        /**
         * Do the transition between two slides, wrapper of the final transition type
         * @param  int actualSlideNumber Actual slide number
         * @param  int slideNumber       Desired slide number
         * @param  mixed callbackFunction  callback function to call when animation end
         */
        base.slideTransition = function(actualSlideNumber,slideNumber,callbackFunction){
            logging?log('transition begin from slide '+actualSlideNumber+' to slide '+slideNumber+' with animation type : '+base.options.animationType):null;

            switch(base.options.animationType){
                case 'fade':
                    base.transitionFade(actualSlideNumber,slideNumber,callbackFunction);
                break;
                case 'vertical':
                    base.transitionVertical(actualSlideNumber,slideNumber,callbackFunction);
                break;
                case 'horizontal':
                    base.transitionHorizontal(actualSlideNumber,slideNumber,callbackFunction);
                break;
                case 'rotateZ':
                    base.transitionRotateZ(actualSlideNumber,slideNumber,callbackFunction);
                break;
            }
        }

        // FADING TRANSITION
        base.transitionFade = function(actualSlideNumber,slideNumber,callbackFunction){
            var oldSlide = base.getSlide(actualSlideNumber);
            var newSlide = base.getSlide(slideNumber);

            base.animate(actualSlideNumber,'backward',function(){
                newSlide.css({position:'relative',zIndex:200,opacity:0,top: (-1 * newSlide.height() * slideNumber)+'px' });
                oldSlide.css({position:'relative',zIndex:100});
                base.actualSlide = slideNumber;
                newSlide.animate({opacity:1},base.options.slideAnimationTime,function(){
                    base.animate(slideNumber,'forward',callbackFunction);
                    oldSlide.css({position:'relative',zIndex:50});
                });
                base.fadeBackground(slideNumber);
            });
        }

        // VERTICAL SCROLLING TRANSITION
        base.transitionVertical = function(actualSlideNumber,slideNumber,callbackFunction){
            var oldSlide = base.getSlide(actualSlideNumber);
            var newSlide = base.getSlide(slideNumber);

            var direction = 'forward';
            if(base.actualSlide > slideNumber) direction = 'backward';

            base.animate(actualSlideNumber,'backward',function(){

                if(direction=='forward'){
                    newSlide.insertAfter(oldSlide);
                }else{
                    newSlide.insertBefore(oldSlide);
                    newSlide.css({marginTop: (-1*newSlide.height())+'px'});
                }

                base.actualSlide = slideNumber;

                if(direction=='forward'){
                    oldSlide.animate({marginTop: (-1*newSlide.height())+'px'},base.options.slideAnimationTime,'easeInOutCubic',function(){
                        oldSlide.insertAfter(newSlide);
                        oldSlide.css({marginTop: 0});
                        base.animate(slideNumber,'forward',callbackFunction);
                    });
                }else{
                    newSlide.animate({marginTop: '0'},base.options.slideAnimationTime,'easeInOutCubic',function(){
                        base.animate(slideNumber,'forward',callbackFunction);
                    });
                }
                base.fadeBackground(slideNumber);
            });
        }

        // HORIZONTAL SCROLLING TRANSITION
        base.transitionHorizontal = function(actualSlideNumber,slideNumber,callbackFunction){
            var oldSlide = base.getSlide(actualSlideNumber);
            var newSlide = base.getSlide(slideNumber);

            var direction = 'forward';
            if(base.actualSlide > slideNumber) direction = 'backward';

            base.animate(actualSlideNumber,'backward',function(){

                if(direction=='forward'){
                    newSlide.insertAfter(oldSlide);
                }else{
                    newSlide.insertBefore(oldSlide);
                    newSlide.css({marginLeft: (-1*newSlide.width())+'px'});
                }

                base.actualSlide = slideNumber;

                if(direction=='forward'){
                    oldSlide.animate({marginLeft: (-1*newSlide.width())+'px'},base.options.slideAnimationTime,'easeInOutCubic',function(){
                        oldSlide.insertAfter(newSlide);
                        oldSlide.css({marginLeft: 0});
                        base.animate(slideNumber,'forward',callbackFunction);
                    });
                }else{
                    newSlide.animate({marginLeft: '0'},base.options.slideAnimationTime,'easeInOutCubic',function(){
                        base.animate(slideNumber,'forward',callbackFunction);
                    });
                }
                base.fadeBackground(slideNumber);
            });
        }

        // EXPERIMENTAL ROTATE TRANSITION (LITTLE VOMITIVE FOR NOW :))
        base.transitionRotateZ = function(actualSlideNumber,slideNumber,callbackFunction){
            var oldSlide = base.getSlide(actualSlideNumber);
            var newSlide = base.getSlide(slideNumber);

            base.animate(actualSlideNumber,'backward',function(){

                newSlide.css({
                    position:'relative',
                    zIndex:200,
                    opacity:1,
                    top: (-1 * newSlide.height() * slideNumber)+'px',
                    '-moz-transform' : 'rotateZ(-180deg)',
                    '-moz-transform-origin':'bottom center',
                    textIndent:-180
                });
                oldSlide.css({
                    position:'relative',
                    zIndex:100,
                     '-moz-transform' : 'rotateZ(0deg)',
                      '-moz-transform-origin':'bottom center',
                    textIndent:0,
                });

                base.actualSlide = slideNumber;

                oldSlide.animate({
                    textIndent : 180
                },
                {
                    duration: base.options.slideAnimationTime,
                    step: function(now, fx){
                      $(this).css('-webkit-transform','rotateZ('+now+'deg)');
                      $(this).css('-moz-transform','rotateZ('+now+'deg)');
                      $(this).css('transform','rotateZ('+now+'deg)');
                    },
                    complete: function(){
                        base.animate(slideNumber,'forward',callbackFunction);
                        oldSlide.css({position:'relative',zIndex:50});
                    }
                });

                newSlide.animate({
                    textIndent : 0
                },
                {
                    duration: base.options.slideAnimationTime,
                    step: function(now, fx){
                      $(this).css('-webkit-transform','rotateZ('+now+'deg)');
                      $(this).css('-moz-transform','rotateZ('+now+'deg)');
                      $(this).css('transform','rotateZ('+now+'deg)');
                    }
                });

                base.fadeBackground(slideNumber);
            });
        }

        /**
         * Fade elements background according to the slide backgroundcolor data
         * @param  int slideNumber desired slide background color
         */
        base.fadeBackground = function(slideNumber){
            // Animate backgroundColor of elements to a particular one define in the data-slide-backgroundcolor of the slide
            // require jquery color animation plugin (like jqueryui)
            var bgColor = base.getSlide(slideNumber).data('slide-backgroundcolor');
            if(bgColor!=undefined && base.options.backgroundElement ){
                logging?log('Animate backgroundColor of "'+base.options.backgroundElement+'"" to '+bgColor):null;
                $(base.options.backgroundElement).animate({
                    backgroundColor: bgColor
                },base.options.slideAnimationTime);
            }
        }

        /**
         * Place the active class on the bullet(s) of the slideNumber slide
         * @param  int slideNumber Number of the slide the bullets have to match
         */
        base.activeBullet = function(slideNumber){
            $.each(base.bullets,function(k,elem){
                elem.removeClass(base.options.bulletClassActive);
            });
            var slide = base.getSlide(slideNumber);
            var id = slide.attr('id');
            if(id!=''){
                var bullets = $('a[href=#'+id+']');
                if(bullets.length>=1){
                    bullets.addClass(base.options.bulletClassActive);
                }
            }
        }

        /**
         * Activate a timeout to the next slide
         * @param  int slideNumber The next slide
         * @param  mixed timing The ms the current slide will show ( not the next slide )
         */
        base.timeout = function(slideNumber, timing){
            if(timing==undefined) timing = base.options.slideTime;
            logging?log('activate timeout to show slide '+slideNumber+' in '+timing+' ms'):null;
            window.clearTimeout(base.slideTimer);
            base.slideTimer = window.setTimeout(function(){base.queue(slideNumber)},timing);
        };

        /**
         * Return the jQuery element of the slide @ slideNumber position
         * @param  int slideNumber the slide you want
         */
        base.getSlide = function(slideNumber){
            return base.slides.eq(slideNumber);
        }

        /**
         * Animate the subelement of the slide
         * @param  int slideNumber  the slide to animate
         * @param  string direction the direction the animation will go ( forward / backward )
         * @param  mixed callbackFunction a callback function to trigger when the last element have complete is animation
         */
        base.animate = function(slideNumber , direction, callbackFunction){
            logging?log('Doing animation of the slide '+slideNumber+' in '+direction+' direction'):null;
            var slideElement = base.getSlide(slideNumber) ; //base.slides.eq(slideNumber);
            if(!$.isFunction(callbackFunction)) callbackFunction = function(){};

            switch(direction){
                default:
                case 'forward':
                    directionModifier = 1;
                break;
                case 'backward':
                    directionModifier = -1;
                break;
            }

            var items = slideElement.find('.jsSlidesItem');

            // define the last item that will finish the animate for the callback
            var first = null;
            var last = 0;
            var smallerDelay = null;
            var higherDelay = 0;

            items.each(function(k){
                var item = $(this);
                var delay = item.data('slide-delay');
                if(delay>0 && delay > higherDelay){
                    higherDelay = delay;
                    last = k;
                }
                if(smallerDelay==null || delay < smallerDelay){
                    smallerDelay = delay;
                    first = k;
                }

            });

            items.each(function(k){
                var item = $(this);


                item.css({
                    position: 'relative',
                    opacity: directionModifier==1 ? 0 : 1,
                    visibility: 'visible',
                });

                var animateOptions = {
                    opacity: directionModifier==1 ? 1 : 0,
                };

                // move the slideItem from a particular position
                var from = item.data('slide-from');

                if(from){
                    switch(from){
                        case 'top':
                            if(directionModifier==1){
                                item.css({top: (-1*base.options.animationDistanceY)+'px'});
                                animateOptions.top = 0;
                            }else{
                                item.css({top: 0});
                                animateOptions.top = (base.options.animationDistanceY)+'px';
                            }
                        break;
                        case 'bottom':
                            if(directionModifier==1){
                                item.css({top: (base.options.animationDistanceY)+'px'});
                                animateOptions.top = 0;
                            }else{
                                item.css({top: 0});
                                animateOptions.top = (-1*base.options.animationDistanceY)+'px';
                            }
                        break;
                        case 'right':
                            if(directionModifier==1){
                                item.css({left: (base.options.animationDistanceX)+'px'});
                                animateOptions.left = 0;
                            }else{
                                item.css({left: 0});
                                animateOptions.left = (-1*base.options.animationDistanceX)+'px';
                            }
                        break;
                        default:
                        case 'left':
                            if(directionModifier==1){
                                item.css({left: (-1*base.options.animationDistanceX)+'px'});
                                animateOptions.left = 0;
                            }else{
                                item.css({left: 0});
                                animateOptions.left = (base.options.animationDistanceX)+'px';
                            }
                        break;
                    }
                }

                // is the slideItem a 3d item that follow mouse
                var thirdD = item.data('slide-3d');
                if(thirdD > 1 && !item.hasClass('thirdified') ){
                    base.thirdDify(item,thirdD);
                }

                // has the slideItem a particular delay for animate
                var delay = item.data('slide-delay');
                if(delay=="undefined"||delay==undefined) delay = 1;

                if(directionModifier==-1){
                    delay = higherDelay-delay;
                    last=first;
                }

                if(k==last){
                    window.setTimeout(function(){ item.stop().animate(animateOptions,base.options.animationTime,callbackFunction); },delay);
                }else{
                    window.setTimeout(function(){ item.stop().animate(animateOptions,base.options.animationTime); },delay);
                }

            });
        }

        /**
         * Add the mousemove handler
         * @param  jqueryElement item The item to add to the 3d elements
         */
        base.thirdDify = function(item){
            if(!base.$el.hasClass('jsSlidesThirdify')){
                logging?log('Adding thirdDify handler'):null;
                base.$el.mousemove(function(e){
                    base.move3d(e.pageX,e.pageY);
                });
                base.$el.mouseleave(function(e){
                    base.move3d($(window).width()/2,$(window).height()/2,true);
                });
                base.$el.addClass('jsSlidesThirdify');
            }
            base.thirdDelements.push(item);
            item.addClass('thirdified');
        };

        /**
         * Triggered by the mousemove when hover the slide
         * @param  int x Mouse position X
         * @param  int y Mouse position Y
         * @param  mixed fluid do we have to go fluidly to the destination
         */
        base.move3d = function(x,y,fluid){
            if(!base.slideTransitionning){
                if(fluid==undefined) fluid=false;

                var sWidth = $(window).width();
                var sHeight = $(window).height();
                var displacementX = ((sWidth/2)-x)/(sWidth/2) * base.options.thirdDXratio * base.options.thirdDlogic;
                var displacementY = ((sHeight/2)-y)/(sHeight/2) * base.options.thirdDYratio * base.options.thirdDlogic;

                $.each(base.thirdDelements, function(k,element){
                    var z = element.data('slide-3d');

                    if(z!=undefined && z!=0){
                        var css = {
                            position: 'relative',
                            top: (displacementY*z)+"px",
                            left: (displacementX*z)+"px"
                        };
                        if(fluid){
                            element.stop().animate(css,base.options.thirdDLeaveDelay)
                        }else{
                            element.stop().animate(css,10,'linear')
                        }
                    }
                });
            }
        };

    };

    $.fn.ADNslide = function(method){

        // getting arguments and method called, method can be a json object
        var methodArguments = arguments;
        var methodName = method;

        // obtain property value
        if(methodName == 'property' && arguments[1] && this[0]){
            var property = arguments[1];
            if( !(plugin = $(this[0]).pluginName(data)) ){
                plugin = new $.ADNslide(this[0]);
            }
            if(plugin[property]){
                return plugin[property];
            }else{
                return null;
            }
        }

        // method and initialisation
        return this.each(function(){
            // if there isn't yet a ADNslide attach to the object, do it
            if( !(plugin = $(this).data(pluginName)) ){
                plugin = new $.ADNslide(this);
            }

            // if a method exist with this name
            if( plugin[methodName] ){
                methodArguments = Array.prototype.slice.call( methodArguments, 1 ) // we suppress the method name of the arguments
            // if it's an object or nothing , we do the init method
            }else if( typeof method === 'object' || !method){
                methodName = 'init';
            }else { // other case ?? error
                return window.console?console.log('ERROR'):false;
            }
            return plugin[methodName].apply( this, methodArguments);
        });
    };

    // This function breaks the chain, but returns
    // the ADNslide if it has been attached to the object.
    $.fn.getADNslide = function(){
        this.data("ADNslide");
    };

})(jQuery);

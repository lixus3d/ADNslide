;(function($){

	pluginName = 'ADNslide';

	$.ADNslide = function(el, options){
        // To avoid scope issues, use 'base' instead of 'this'
        // to reference this class from internal events and functions.
        var base = this;
        
        // Access to jQuery and DOM versions of element
        base.$el = $(el);
        base.el = el;

        // Add a reverse reference to the DOM object
        base.$el.data("ADNslide", base);

        this.thirdDelements = [];
        this.slides = base.$el.find('.slide');
        
        base.init = function(initOptions){
        	base.options = $.extend({},$.ADNslide.defaultOptions, initOptions);
            // Put your initialization code here        
            // set default position of moving elements 
            base.$el.find('.jsSlidesItem').each(function(){
                var item = $(this);
                item.data('slide-defX',item.offset().left);
                item.data('slide-defX',item.offset().top);
            });
        	window.setTimeout(function(){base.start()},base.options.initTime);
        };

        base.animate = function(){
        	/*var offset = base.$el.offset();
        	var left = offset.left;
        	var top = offset.top;
        	var right = left + base.$el.width();
        	var bottom = top
        	log(left);*/

        	var items = $('.jsSlidesItem').each(function(){
        		var item = $(this);

        		item.css({
        			position: 'relative',
        			opacity:0,
        		});

        		var animateOptions = {
        			opacity:1,
        		};

                // move the slideItem from a particular position
        		var from = item.data('slide-from');        		

        		if(from){
        			switch(from){

        				case 'top':
                            item.css({top: '-200px'});
        					animateOptions.top = 0;        					
        				break;
        				case 'bottom':
                            item.css({top: '200px'});
        					animateOptions.top = 0;        					
        				break;
        				case 'right':
                            item.css({left: '200px'});
        					animateOptions.left = 0;        					
        				break;
        				default:
        				case 'left':
                            item.css({left: '-200px'});
        					animateOptions.left = 0;        					
        				break;
        			}
        		}

                // is the slideItem a 3d item that follow mouse 
                var thirdD = item.data('slide-3d');
                if(thirdD > 1){ 
                    base.thirdDify(item,thirdD);
                }                

                // has the slideItem a particular delay for animate
        		var delay = item.data('slide-delay');

        		if(delay=="undefined"||delay==undefined){
        			item.animate(animateOptions,base.options.animationTime);
        		}else{
					window.setTimeout(function(){ item.animate(animateOptions,base.options.animationTime); },delay);  		
        		}       		
        		
        	});
        }

        /**
         * Add the mousemove handler 
         * @param  jqueryElement item The item to add to the 3d elements          
         */
        base.thirdDify = function(item){
            if(!base.$el.hasClass('jsSlidesThirdify')){
                log('thirdDify')
                base.$el.mousemove(function(e){
                    base.move3d(e.pageX,e.pageY);
                });
                base.$el.mouseleave(function(e){
                    base.move3d($(window).width()/2,$(window).height()/2,true);
                });
                base.$el.addClass('jsSlidesThirdify');
            }
            base.thirdDelements.push(item);
        };

        /**
         * Triggered by the mousemove when hover the slide 
         * @param  int x Mouse position X
         * @param  int y Mouse position Y
         * @param  mixed fluid do we have to go fluidly to the destination 
         */
        base.move3d = function(x,y,fluid){
            if(fluid==undefined) fluid=false;

            var sWidth = $(window).width();
            var sHeight = $(window).height();
            var displacementX = ((sWidth/2)-x)/(sWidth/2) * base.options.thirdDXratio * base.options.thirdDlogic;
            var displacementY = ((sHeight/2)-y)/(sHeight/2) * base.options.thirdDYratio * base.options.thirdDlogic;

            $.each(base.thirdDelements, function(k,element){
                var z = element.data('slide-3d');
                
                if(z>1){
                    var defX = element.data('slide-defX');
                    var defY = element.data('slide-defY');
                    var css = {
                        position: 'relative',
                        top: (displacementY*z)+"px",
                        left: (displacementX*z)+"px"
                    };
                    if(fluid){
                        element.animate(css,base.options.thirdDLeaveDelay)
                    }else{
                        element.css(css);
                    }
                }
            });            

        };

        base.start = function(){
        	log('animate');
        	base.animate();
        };       

	};

	$.ADNslide.defaultOptions = {
		initTime: 300,
		animationTime: 500,
        thirdDLeaveDelay: 500,
        thirdDXratio: 1,
        thirdDYratio: 0.5,
        thirdDlogic: 1,
	};

	$.fn.ADNslide = function(method){

		// récupération des arguments et nom de la methode 
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
			// si le plugin n'est pas encore associé à l'objet , l'associé 
			if( !(plugin = $(this).data(pluginName)) ){
				plugin = new $.ADNslide(this);
			}

			// si methodName correspond à une méthode 
			if( plugin[methodName] ){
				methodArguments = Array.prototype.slice.call( methodArguments, 1 )
			// sinon si c'est un objet ou rien de passé , faire methode init 
			}else if( typeof method === 'object' || !method){
				methodName = 'init';
			}else {
				return log('ERROR');
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

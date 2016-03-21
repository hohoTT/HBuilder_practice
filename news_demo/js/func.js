var api = 'http://zhiwen.cloud.cnwest.com/api1.0/index.php';//api地址信息
var http_url = 'http://zhiwen.cloud.cnwest.com/';
var http_share_api = 'http://zhiwen.cnwest.com/share/?openid=';
var http_share_icon = 'img/icons/96.png';
var pull_cache_time = 0;
var img_map = [];
/**
 * 获取服务器数据函数
 * @param {Object} url 地址
 * @param {Object} querydata 请求数据
 * @param {Object} callback 返回值
 * errorcallback 错误发生时回调函数
 * cachetime 缓存数据时间
 */
function getApiData(url,querydata,callback)
{
	var cache_name = url+'_'+mui.param(querydata);//缓存名称
	var cache_time = 0;//缓存时间
	if(arguments[4] && typeof arguments[4] != 'null') cache_time = arguments[4]*1000;//设置缓存时间  单位s
	
	var lastcheck = plus.storage.getItem(cache_name+'_updatetime');//存储栏目信息的更新时间
	var dc = parseInt(lastcheck);//不存在就是 NaN
	var dn = (new Date()).getTime();
	
	if(dn-dc < cache_time){//未超过上次检测间隔，不需要进行服务器更新 单位为ms,7天为7*24*60*60*1000=604800000, 24
		//console.log(cache_name);
		var data = eval('('+ plus.storage.getItem(cache_name) +')');
		if(typeof callback == "function") callback(data);
	}else{
		//console.log("ajax");
		mui.ajax(url,{
			data:querydata,
			dataType:'json',//服务器返回json格式数据
			type:'get',//HTTP请求类型
			timeout:10000,//超时时间设置为10秒；
			success:function(data){
				//alert(JSON.stringify(data));
				//服务器返回响应，根据响应结果，分析是否登录成功；
				if(data.status!=0 || data.msg != 'ok'){
					plus.nativeUI.alert('服务器返回数据格式错误,请关闭应用重试');
					if(arguments[3] && typeof arguments[3] == 'function') arguments[3]();
					return;
				}
				//alert(JSON.stringify(data));
				
				plus.storage.setItem(cache_name,JSON.stringify(data));//存储数据值
				plus.storage.setItem(cache_name+'_updatetime', (new Date()).getTime().toString());//设置本次更新时间
						
				if(typeof callback == "function") callback(data);
			},
			error:function(xhr,type,errorThrown){
				//异常处理
				//console.log(type);
				if(arguments[3] && typeof arguments[3] == 'function'){
					arguments[3]();
				}else{
					plus.nativeUI.alert('网络通信异常,请关闭应用重试 '+type);
				}
				return;
			}
		});
	}
	return;
}
//清除全部缓存信息
function clearStorage()
{
	plus.storage.clear();
	plus.cache.clear();
}
/**
 * 取得时间
 * @param {Object} str linux时间截
 * @param {Object} type 格式
 */function geMyTime(str,type)
{
    str = parseInt(str)*1000;
    var content = "";
    var addtime_obj = new Date();
    addtime_obj.setTime(str);
    add_year = addtime_obj.getYear();
    add_year = add_year<1900?(1900+add_year):add_year;
    add_mon = addtime_obj.getMonth()+1;
    if(add_mon<10) add_mon='0'+add_mon;
    add_daily = addtime_obj.getDate();
    if(add_daily<10) add_daily='0'+add_daily;
    add_hour = addtime_obj.getHours();
    if(add_hour<10) add_hour='0'+add_hour;
    add_min = addtime_obj.getMinutes();
    if(add_min<10) add_min='0'+add_min;
    add_sec = addtime_obj.getSeconds();
    if(add_sec<10) add_sec='0'+add_sec;
    switch(type)
    {
        case 1://2001-12-12 12:12:01
        content = add_year+"-"+add_mon+"-"+add_daily+" "+add_hour+":"+add_min+":"+add_sec;
        break;
        case 2://12-12 12:12:01
        content = add_mon+"-"+add_daily+" "+add_hour+":"+add_min+":"+add_sec;
        break;
        case 3://2001-12-12
        content = add_year+"-"+add_mon+"-"+add_daily;
        break;
        case 4://12-12 12:12
        content = add_mon+"-"+add_daily+"/"+add_hour+":"+add_min;
        break;
        case 5://2001-12-12 12:12:01
        content = add_year+"-"+add_mon+"-"+add_daily+" "+add_hour+":"+add_min;
        break;
        case 6://12:12
        content = add_hour+":"+add_min;
        break;
    }
    return content;
}
//得到今天 2015-12
function getTodayDate()
{    
    var addtime_obj = new Date();
    var add_year = addtime_obj.getYear();
    add_year = add_year<1900?(1900+add_year):add_year;
    var add_mon = addtime_obj.getMonth()+1;
    if(add_mon<10) add_mon='0'+add_mon;
            
    var str = add_year+'-'+add_mon;
    return str;
}
//解析url地址
function parseURL(url)
{
    var a =  document.createElement('a');
    a.href = url;
    return {
        host: a.hostname,
        port: a.port,
        path: a.pathname.replace(/^([^\/])/,'/$1')
    };
}
//生成缩略图
function mk_timg(img_src)
{
    var t = this;
    var thumb_size = {width:640,height:0};
    var thumb_a = 0;
    if(arguments[1]){
        thumb_size = arguments[1];
    }
    
    if(arguments[2]){
        thumb_a = arguments[2];
    }
            
    var str = '';
    var src_a = parseURL(img_src);
    
    str = 'http://wap.cnwest.com/data/thumb/' + src_a.host;
            //alert(src_a.port);
    str += parseInt(src_a.port,10) ?'/'+src_a.port:'/80';
    
    //str += '/'+getTodayDate();
    var reg = /\/([\d]+)\//i;
    if(reg.test(src_a.path) && RegExp.$1.length == 8)
    {
        var date_str = RegExp.$1;
        str += '/'+date_str.substr(0,4)+'-'+date_str.substr(4,2);
    }else{
        str += '/'+getTodayDate();
    }
            
    var filename = src_a.path.replace(/\//g,',,');
    var pos = filename.lastIndexOf('.');
    filename = filename.substr(2,pos-2)+'((w-'+thumb_size.width+',h-'+thumb_size.height+',q-100,a-'+thumb_a+'))'+filename.substr(pos);
    str += '/'+filename;
    
    return str;
}
//延迟加载代码 Start
var lazyLoad = {
    filter_str:'con-img',
	flag_start:1,//保证不重复执行
	iscut:false,//是否进行剪裁
	//延迟加载图片代码启动
    load: function()
    {
        var t = this;
        t.start();
        window.addEventListener("scroll",function(e){
        	t.start();
		});
    },
    start: function()
    {
        var t = this;
		if(!t.flag_start) return;
		t.flag_start = 0;

		mui('img.'+t.filter_str).each(function(){
			var self = this;
			//console.log(self.src);
			//console.log(t.isVisible(self));
			if(t.isVisible(self)){
				var src_url = self.getAttribute('data-src');
				var special_str = src_url.substring(0,5);
				if(special_str == "data/")
				{
					src_url = http_url + src_url;
				}
				if(t.iscut){
					var thumb_size = self.getAttribute('data-set');
					thumb_size = thumb_size.split(':');
					if(thumb_size[0] == 480 && thumb_size[1]==360){
						src_url = mk_timg(src_url,{width:thumb_size[0],height:thumb_size[1]});
					}else{
						src_url = mk_timg(src_url,{width:thumb_size[0],height:thumb_size[1]},1);
					}
					
				}
				//console.log(src_url);
				self.src = src_url;
				self.classList.remove(t.filter_str);
			}
		});
		t.flag_start = 1;
    },
    isVisible: function(node)
    {
        var top = node.getBoundingClientRect().top //元素顶端到可见区域顶端的距离
		var se = document.documentElement.clientHeight //浏览器可见区域高度。
		if(top <= se ) {
			return true;
		} 
        return false;
    }
};
//延迟加载代码 end

//取得栏目图标信息
function getCateInfo(cateid){
	var cache_name = api +'_'+mui.param({m:'news',action:'category'});//缓存名称
	CateInfo = eval('('+ plus.storage.getItem(cache_name) +')');
	CateInfo = CateInfo.category;
			
	var content = {"name":"","icon":""};
	var len = CateInfo.length;
	for(var i=0;i<len;i++)
	{
		if(CateInfo[i].id == cateid){
			content.icon = CateInfo[i].icon;
			content.name = CateInfo[i].name;
			break;
		}
	}
	return content;
}
//取得栏目图标信息end           

/**
 * 判断应用升级模块，从url地址下载升级描述文件到本地local路径
 * yanyilin@dcloud.io
 * 
 * 升级文件为JSON格式数据，如下：
{
	"appid":"HelloH5",
    "iOS":{
    	"version":"iOS新版本号，如：1.0.0",
    	"note":"iOS新版本描述信息，多行使用\n分割",
    	"url":"Appstore路径，如：itms-apps://itunes.apple.com/cn/app/hello-h5+/id682211190?l=zh&mt=8"
    },
    "Android":{
    	"version":"Android新版本号，如：1.0.1",
    	"note":"Android新版本描述信息，多行使用\n分割",
    	"url":"apk文件下载地址，如：http://www.dcloud.io/helloh5p/HelloH5.apk"
    }
}
 *
 */
var AppUpdate ={
	server: "http://zhiwen.cloud.cnwest.com/update_store.php",//获取升级描述文件服务器地址
	localDir: "update",//本地保存升级描述目录
	localFile: "update.json",//本地保存升级文件名
	keyUpdate: "updateCheck",//取消升级键名
	keyAbort: "updateAbort",//忽略版本键名
	checkInterval: 3600000,//升级检查间隔，单位为ms,7天为7*24*60*60*1000=604800000, 如果每次启动需要检查设置值为0 3600000
	dir: null,
	auto:true,//自动更新表示
/**
 * 准备升级操作
 * 创建升级文件保存目录
 */
initUpdate:function(auto){
	// 打开doc根目录
	var t = this;
	t.auto = auto;
	plus.io.requestFileSystem( plus.io.PRIVATE_DOC, function(fs){
		fs.root.getDirectory( t.localDir, {create:true}, function(entry){
			t.dir = entry;
			t.checkUpdate();
			
			if(!t.auto){
				plus.nativeUI.showWaiting( "检查中..." );
			}
			
		}, function(e){
			console.log( "准备升级操作，打开update目录失败："+e.message );
		});
	},function(e){
		console.log( "准备升级操作，打开doc目录失败："+e.message );
	});
},
/**
 * 检测程序升级
 */
checkUpdate: function() {
	var t = this;
	// 判断升级检测是否过期
	var lastcheck = plus.storage.getItem( t.keyUpdate );
	if ( lastcheck && t.auto) {
		var dc = parseInt( lastcheck );
		var dn = (new Date()).getTime();
		if ( dn-dc < t.checkInterval ) {	// 未超过上次升级检测间隔，不需要进行升级检查
			return;
		}
		// 取消已过期，删除取消标记
		plus.storage.removeItem( t.keyUpdate );
	}
	// 读取本地升级文件
	t.dir.getFile( t.localFile, {create:false}, function(fentry){
		fentry.file( function(file){
			var reader = new plus.io.FileReader();
			reader.onloadend = function ( e ) {
				fentry.remove();
				var data = null;
				try{
					//console.log(e.target.result)
					data=JSON.parse(e.target.result);
				}catch(e){
					console.log( "读取本地升级文件，数据格式错误！" );
					return;
				}
				t.checkUpdateData( data );
			}
			reader.readAsText(file);
		}, function(e){
			console.log( "读取本地升级文件，获取文件对象失败："+e.message );
			fentry.remove();
		} );
	}, function(e){
		// 失败表示文件不存在，从服务器获取升级数据
		t.getUpdateData();
	});
},
/**
 * 检查升级数据
 */
checkUpdateData: function( j ){
	var t = this;
	//console.log("aaaaa");
	var curVer=plus.runtime.version,
	inf = j[plus.os.name];
	if ( inf ){
		var srvVer = inf.version;
		// 判断是否存在忽略版本号
		var vabort = plus.storage.getItem( t.keyAbort );
		if ( vabort && srvVer==vabort ) {
			// 忽略此版本
			if(!t.auto){
				plus.nativeUI.alert('已经是最新版本');
				plus.nativeUI.closeWaiting();
			}
			return;
		}
		// 判断是否需要升级
		if ( t.compareVersion(curVer,srvVer) ) {
			// 提示用户是否升级
			plus.nativeUI.confirm( inf.note, function(i){
				if ( 0==i.index ) {
					plus.runtime.openURL( inf.url );
				} else if ( 1==i.index ) {
					plus.storage.setItem( t.keyAbort, srvVer );
					plus.storage.setItem( t.keyUpdate, (new Date()).getTime().toString() );
				} else {
					plus.storage.setItem( t.keyUpdate, (new Date()).getTime().toString() );
				}
			}, inf.title, ["立即更新","跳过此版本","取　　消"] );
			
			if(!t.auto){
				plus.nativeUI.closeWaiting();
			}
			return;
		}
	}
	if(!t.auto){
		plus.nativeUI.alert('已经是最新版本');
		plus.nativeUI.closeWaiting();
	}
},
/**
 * 从服务器获取升级数据
 */
getUpdateData: function(){
	var t = this;
	var xhr = new plus.net.XMLHttpRequest();
	xhr.onreadystatechange = function () {
        switch ( xhr.readyState ) {
            case 4:
                if ( xhr.status == 200 ) {
                	// 保存到本地文件中
                	t.dir.getFile( t.localFile, {create:true}, function(fentry){
                		fentry.createWriter( function(writer){
                			writer.onerror = function(){
                				console.log( "获取升级数据，保存文件失败！" );
                			}
                			writer.write( xhr.responseText );
                			
                			if(!t.auto) t.checkUpdate();//手动刷新设置
                		}, function(e){
                			console.log( "获取升级数据，创建写文件对象失败："+e.message );
                		} );
                	}, function(e){
                		console.log( "获取升级数据，打开保存文件失败："+e.message );
                	});
                } else {
                	console.log( "获取升级数据，联网请求失败："+xhr.status );
                }
                break;
            default :
                break;
        }
	}
	xhr.open( "GET", t.server );
	xhr.send();
},
/**
 * 比较版本大小，如果新版本nv大于旧版本ov则返回true，否则返回false
 * @param {String} ov
 * @param {String} nv
 * @return {Boolean} 
 */
compareVersion: function( ov, nv ){
	if ( !ov || !nv || ov=="" || nv=="" ){
		return false;
	}
	var b=false,
	ova = ov.split(".",4),
	nva = nv.split(".",4);
	for ( var i=0; i<ova.length&&i<nva.length; i++ ) {
		var so=ova[i],no=parseInt(so),sn=nva[i],nn=parseInt(sn);
		if ( nn>no || sn.length>so.length  ) {
			return true;
		} else if ( nn<no ) {
			return false;
		}
	}
	if ( nva.length>ova.length && 0==nv.indexOf(ov) ) {
		return true;
	}
}
}

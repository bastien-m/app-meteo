export namespace data {
	
	export class LoadedDpt {
	    startDate: string;
	    endDate: string;
	    lines: number;
	    dpt: string;
	    filename: string;
	
	    static createFrom(source: any = {}) {
	        return new LoadedDpt(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.startDate = source["startDate"];
	        this.endDate = source["endDate"];
	        this.lines = source["lines"];
	        this.dpt = source["dpt"];
	        this.filename = source["filename"];
	    }
	}
	export class RainByStation {
	    NumPost: string;
	    Year: string;
	    Rain: number;
	    Temperature: number;
	
	    static createFrom(source: any = {}) {
	        return new RainByStation(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.NumPost = source["NumPost"];
	        this.Year = source["Year"];
	        this.Rain = source["Rain"];
	        this.Temperature = source["Temperature"];
	    }
	}
	export class StationAvgRain {
	    NumPost: string;
	    CommonName: string;
	    Lat: number;
	    Lon: number;
	    AvgRain: number;
	
	    static createFrom(source: any = {}) {
	        return new StationAvgRain(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.NumPost = source["NumPost"];
	        this.CommonName = source["CommonName"];
	        this.Lat = source["Lat"];
	        this.Lon = source["Lon"];
	        this.AvgRain = source["AvgRain"];
	    }
	}
	export class StationInfo {
	    NumPost: string;
	    CommonName: string;
	    Lat: number;
	    Lon: number;
	    Alti: number;
	
	    static createFrom(source: any = {}) {
	        return new StationInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.NumPost = source["NumPost"];
	        this.CommonName = source["CommonName"];
	        this.Lat = source["Lat"];
	        this.Lon = source["Lon"];
	        this.Alti = source["Alti"];
	    }
	}
	export class WeatherData {
	    NumPost: string;
	    // Go type: time
	    Date: any;
	    Rain: number;
	    MeanTemperature?: number;
	    RainDuration?: number;
	    Sigma?: number;
	    MeanHumidity?: number;
	
	    static createFrom(source: any = {}) {
	        return new WeatherData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.NumPost = source["NumPost"];
	        this.Date = this.convertValues(source["Date"], null);
	        this.Rain = source["Rain"];
	        this.MeanTemperature = source["MeanTemperature"];
	        this.RainDuration = source["RainDuration"];
	        this.Sigma = source["Sigma"];
	        this.MeanHumidity = source["MeanHumidity"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}


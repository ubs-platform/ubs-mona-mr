import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';


@Schema()
export class Locality {
    _id?: string;

    @Prop({ type: String })
    name?: string;

    // source dataset city id, unique within its subdivision
    @Prop({ type: String })
    code?: string;

    @Prop({ type: String, index: true })
    countryCode?: string;

    // only unique combined with countryCode, not globally
    @Prop({ type: String, index: true })
    subdivisionCode?: string;
}

@Schema()
export class Subdivision {
    _id?: string;

    @Prop({ type: String })
    name?: string;

    // state/province iso2 code, e.g. "74" for Bartın
    @Prop({ type: String })
    code?: string;

    @Prop({ type: String, index: true })
    countryCode?: string;

    // Birinci seviye idari subdivision bilgisi olan ülkeler için true.
    @Prop({ type: Boolean })
    hasSubdivisions?: boolean;
}


@Schema()
export class Country {
    _id?: string;

    @Prop({ type: String })
    name?: string;

    @Prop({ type: String, index: true })
    code?: string;

    @Prop({ type: String })
    localeCode?: string;

    // Birinci seviye idari subdivision bilgisi olan ülkeler için true.
    @Prop({ type: Boolean })
    hasSubdivisions?: boolean;
}
export const
    CountrySchema = SchemaFactory.createForClass(Country),
    SubdivisionSchema = SchemaFactory.createForClass(Subdivision),
    LocalitySchema = SchemaFactory.createForClass(Locality);

/*

CityName (Şehir / İl): Adresin bağlı olduğu ana il (Örn: Ankara, İstanbul, İzmir) bilgisini tutar. UBL-TR şemalarında zorunlu alanlardan biridir.
CitySubdivisionName (İlçe / Semt): İl içindeki alt idari birimi veya ilçeyi (Örn: Çankaya, Beşiktaş, Bornova) ifade eder. 
Bu alan da Türkiye şartlarında adresin zorunlu bileşenleri arasındadır.
CountrySubentity / Eyalet: Uluslararası standartlarda (OASIS UBL) yer almasına rağmen UBL-TR 
yerelleştirmesinde Türkiye'nin idari yapısında eyalet sistemi olmadığından aktif olarak kullanılmaz 
veya boş bırakılır. 
Türkiye adreslerinde bölge/ilçe/şehir ayrımları yukarıdaki iki alanla çözülür.
*/
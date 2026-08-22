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
}
export const
    CountrySchema = SchemaFactory.createForClass(Country),
    SubdivisionSchema = SchemaFactory.createForClass(Subdivision),
    LocalitySchema = SchemaFactory.createForClass(Locality);


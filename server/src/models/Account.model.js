import mongoose from "mongoose";
import { ProviderEnum } from "../enums/account-provider.enum.js";

const accountSchema = new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    provider: {
      type: String,
      enum: Object.values(ProviderEnum),
      required: true,
    },
    providerId: {
      type: String,
      required: true,
      unique: true,
    },
    refreshToken: { type: String, default: null },
    tokenExpiry: { type: Date, default: null },
},
{
    timestamps: true,
    toJSON:{
        transform(doc, ret){
            delete ret.refreshToken;
        },
    },
}
)

const accountModel = mongoose.model('Account', accountSchema)
export default accountModel;
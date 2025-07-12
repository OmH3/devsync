import bcrypt from 'bcrypt';
export const hashValue = async(value) => {
    const saltRounds = 10;
    return await bcrypt.hash(value, saltRounds);
}

export const compareValue = async(value, hash) => {
    return await bcrypt.compare(value, hash);
}